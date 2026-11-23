/**
 * Budget alerts for freshly synced transactions. The sync job collects the ids of
 * new, eligible transactions and hands them here after the Gmail loop.
 *
 * Per transaction: load it with its category, skip if already alerted, read
 * budget_status() as of the right date (so the spend includes it), build one
 * message with the pure rules, claim the budget_alert_log row, then push.
 *
 * Logs carry only ids, rules and counts. Titles and bodies (merchants, amounts)
 * stay out of the logs because GitHub Actions logs of this public repo are public.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  alertAsOfDate,
  buildBudgetAlert,
  claimBudgetAlert,
  fetchAlertSettings,
  fetchAlertTransaction,
  fetchBudgetStatus,
  hasBudgetAlert,
  type AlertSettings,
  type AlertTransactionRow,
  type BudgetAlertMessage,
  type BudgetAlertRule,
  type BudgetStatus,
} from '@personal-dashboard/supabase-queries';
import { Logger } from '../../services/ingestor/src/utils/logger';
import { DASHBOARD_URL, sendPushToActiveSubscriptions, type PushPayload, type PushResult } from './lib/push';

export interface BudgetAlertDeps {
  fetchSettings(): Promise<AlertSettings | null>;
  fetchTransaction(id: number): Promise<AlertTransactionRow | null>;
  fetchStatus(asOf: string): Promise<BudgetStatus[]>;
  hasAlert(id: number): Promise<boolean>;
  claim(id: number, message: BudgetAlertMessage): Promise<boolean>;
  push(payload: PushPayload): Promise<PushResult>;
}

export type BudgetAlertOutcome =
  | { transactionId: number; status: 'sent'; rules: BudgetAlertRule[]; delivered: number }
  | { transactionId: number; status: 'dry_run'; rules: BudgetAlertRule[]; title: string; body: string; alreadySent: boolean }
  | { transactionId: number; status: 'skipped'; reason: string }
  | { transactionId: number; status: 'failed'; reason: string };

export interface BudgetAlertOptions {
  /** Build the messages without claiming the log row or sending anything. */
  dryRun?: boolean;
  now?: Date;
  dashboardUrl?: string;
}

export function supabaseBudgetAlertDeps(supabase: SupabaseClient): BudgetAlertDeps {
  return {
    fetchSettings: () => fetchAlertSettings(supabase),
    fetchTransaction: (id) => fetchAlertTransaction(supabase, id),
    fetchStatus: (asOf) => fetchBudgetStatus(supabase, asOf),
    hasAlert: (id) => hasBudgetAlert(supabase, id),
    claim: (id, message) => claimBudgetAlert(supabase, id, message),
    push: (payload) => sendPushToActiveSubscriptions(supabase, payload),
  };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : (err as any)?.message ?? String(err);
}

function skipped(transactionId: number, reason: string): BudgetAlertOutcome {
  Logger.info('Budget alert skipped', { event: 'budget_alert_skipped', transactionId, reason });
  return { transactionId, status: 'skipped', reason };
}

export async function processBudgetAlerts(
  transactionIds: number[],
  deps: BudgetAlertDeps,
  options: BudgetAlertOptions = {},
): Promise<BudgetAlertOutcome[]> {
  if (transactionIds.length === 0) return [];

  const now = options.now ?? new Date();
  const dashboardUrl = options.dashboardUrl ?? DASHBOARD_URL;

  const settings = await deps.fetchSettings();
  if (!settings) {
    return transactionIds.map((id) => skipped(id, 'no_settings'));
  }

  const statusByDate = new Map<string, Promise<BudgetStatus[]>>();
  const statusFor = (asOf: string) => {
    if (!statusByDate.has(asOf)) statusByDate.set(asOf, deps.fetchStatus(asOf));
    return statusByDate.get(asOf)!;
  };

  const outcomes: BudgetAlertOutcome[] = [];

  for (const transactionId of transactionIds) {
    try {
      const txn = await deps.fetchTransaction(transactionId);
      if (!txn) {
        outcomes.push(skipped(transactionId, 'not_found'));
        continue;
      }

      const alreadySent = await deps.hasAlert(transactionId);
      if (alreadySent && !options.dryRun) {
        outcomes.push(skipped(transactionId, 'duplicate'));
        continue;
      }

      const rows = await statusFor(alertAsOfDate(txn.txnDate, now));
      const budget = txn.categoryId == null ? undefined : rows.find((r) => r.categoryId === txn.categoryId);
      const result = buildBudgetAlert(txn, settings, budget);

      // `in` narrows the union even without strictNullChecks.
      if ('reason' in result) {
        outcomes.push(skipped(transactionId, result.reason));
        continue;
      }

      const { message } = result;

      if (options.dryRun) {
        outcomes.push({ transactionId, status: 'dry_run', rules: message.rules, title: message.title, body: message.body, alreadySent });
        continue;
      }

      if (!(await deps.claim(transactionId, message))) {
        outcomes.push(skipped(transactionId, 'duplicate'));
        continue;
      }

      const push = await deps.push({
        title: message.title,
        body: message.body,
        tag: `budget-alert-${transactionId}`,
        link: `${dashboardUrl}/finance/budgets`,
      });

      if (push.sent === 0) {
        Logger.error('Budget alert not delivered', {
          event: 'budget_alert_failed',
          transactionId,
          rules: message.rules,
          failed: push.failed,
          reason: 'no_delivery',
        });
        outcomes.push({ transactionId, status: 'failed', reason: 'no_delivery' });
        continue;
      }

      Logger.info('Budget alert sent', {
        event: 'budget_alert_sent',
        transactionId,
        rules: message.rules,
        delivered: push.sent,
        failed: push.failed,
      });
      outcomes.push({ transactionId, status: 'sent', rules: message.rules, delivered: push.sent });
    } catch (err) {
      Logger.error('Budget alert failed', { event: 'budget_alert_failed', transactionId, error: errorMessage(err) });
      outcomes.push({ transactionId, status: 'failed', reason: errorMessage(err) });
    }
  }

  return outcomes;
}

/** Never throws: an alert problem must not fail the Gmail sync. */
export async function processBudgetAlertsSafely(
  transactionIds: number[],
  deps: BudgetAlertDeps,
  options: BudgetAlertOptions = {},
): Promise<BudgetAlertOutcome[]> {
  try {
    return await processBudgetAlerts(transactionIds, deps, options);
  } catch (err) {
    Logger.error('Budget alerts aborted', {
      event: 'budget_alert_failed',
      transactionIds,
      error: errorMessage(err),
    });
    return transactionIds.map((transactionId) => ({ transactionId, status: 'failed' as const, reason: errorMessage(err) }));
  }
}
