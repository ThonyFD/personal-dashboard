import type { SupabaseClient } from '@supabase/supabase-js';
import type { AlertSettings, AlertTransaction, BudgetAlertMessage, BudgetStatus } from './budget-alerts.js';

export interface Budget {
  id: number;
  categoryId: number;
  label: string;
  emoji: string;
  monthlyLimit: number;
  isActive: boolean;
}

export interface AlertTransactionRow extends AlertTransaction {
  txnDate: string;
}

const BUDGET_COLUMNS = 'id, category_id, label, emoji, monthly_limit, is_active';

function mapBudget(r: any): Budget {
  return {
    id: Number(r.id),
    categoryId: Number(r.category_id),
    label: r.label,
    emoji: r.emoji,
    monthlyLimit: Number(r.monthly_limit),
    isActive: r.is_active,
  };
}

export function mapBudgetStatusRow(r: any): BudgetStatus {
  return {
    categoryId: Number(r.category_id),
    label: r.label,
    emoji: r.emoji,
    monthlyLimit: Number(r.monthly_limit),
    spent: Number(r.spent),
    remaining: Number(r.remaining),
    pct: Number(r.pct),
    daysLeft: Number(r.days_left),
  };
}

/**
 * Spend vs cap per active budget for the month of `asOf` (YYYY-MM-DD).
 * Without `asOf`, the database uses today in America/Panama.
 */
export async function fetchBudgetStatus(client: SupabaseClient, asOf?: string): Promise<BudgetStatus[]> {
  const { data, error } = await client.rpc('budget_status', asOf ? { p_as_of: asOf } : {});
  if (error) throw error;
  return (data ?? []).map(mapBudgetStatusRow);
}

export async function fetchBudgets(client: SupabaseClient): Promise<Budget[]> {
  const { data, error } = await client.from('budgets').select(BUDGET_COLUMNS).order('label');
  if (error) throw error;
  return (data ?? []).map(mapBudget);
}

export async function createBudget(
  client: SupabaseClient,
  input: { categoryId: number; label: string; emoji: string; monthlyLimit: number },
): Promise<Budget> {
  const { data, error } = await client
    .from('budgets')
    .insert({
      category_id: input.categoryId,
      label: input.label,
      emoji: input.emoji,
      monthly_limit: input.monthlyLimit,
    })
    .select(BUDGET_COLUMNS)
    .single();
  if (error) throw error;
  return mapBudget(data);
}

export async function updateBudget(
  client: SupabaseClient,
  id: number,
  patch: Partial<Pick<Budget, 'label' | 'emoji' | 'monthlyLimit' | 'isActive'>>,
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.label !== undefined) row.label = patch.label;
  if (patch.emoji !== undefined) row.emoji = patch.emoji;
  if (patch.monthlyLimit !== undefined) row.monthly_limit = patch.monthlyLimit;
  if (patch.isActive !== undefined) row.is_active = patch.isActive;

  const { error } = await client.from('budgets').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteBudget(client: SupabaseClient, id: number): Promise<void> {
  const { error } = await client.from('budgets').delete().eq('id', id);
  if (error) throw error;
}

export function mapAlertSettings(r: any): AlertSettings {
  return {
    alertsEnabled: r.alerts_enabled,
    notifyEveryPurchase: r.notify_every_purchase,
    bigPurchaseThreshold: Number(r.big_purchase_threshold),
    frozenCards: (r.frozen_cards ?? []).map(String),
  };
}

/** The single settings row (id = 1), or null if the migration's row is missing. */
export async function fetchAlertSettings(client: SupabaseClient): Promise<AlertSettings | null> {
  const { data, error } = await client
    .from('alert_settings')
    .select('alerts_enabled, notify_every_purchase, big_purchase_threshold, frozen_cards')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapAlertSettings(data) : null;
}

export async function updateAlertSettings(client: SupabaseClient, patch: Partial<AlertSettings>): Promise<void> {
  const row: Record<string, unknown> = { id: 1 };
  if (patch.alertsEnabled !== undefined) row.alerts_enabled = patch.alertsEnabled;
  if (patch.notifyEveryPurchase !== undefined) row.notify_every_purchase = patch.notifyEveryPurchase;
  if (patch.bigPurchaseThreshold !== undefined) row.big_purchase_threshold = patch.bigPurchaseThreshold;
  if (patch.frozenCards !== undefined) row.frozen_cards = patch.frozenCards;

  const { error } = await client.from('alert_settings').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

/** Transaction with its merchant's category, as the alert rules need it. */
export async function fetchAlertTransaction(
  client: SupabaseClient,
  id: number,
): Promise<AlertTransactionRow | null> {
  const { data, error } = await client
    .from('v_transactions')
    .select('id, amount, txn_type, txn_date, merchant_name, card_last4, merchant_category_id')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = data as any;
  return {
    id: Number(r.id),
    amount: Number(r.amount),
    txnType: String(r.txn_type),
    txnDate: String(r.txn_date),
    merchantName: r.merchant_name ?? null,
    cardLast4: r.card_last4 ?? null,
    categoryId: r.merchant_category_id == null ? null : Number(r.merchant_category_id),
  };
}

export async function hasBudgetAlert(client: SupabaseClient, transactionId: number): Promise<boolean> {
  const { data, error } = await client
    .from('budget_alert_log')
    .select('transaction_id')
    .eq('transaction_id', transactionId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

/**
 * Claims the single alert slot of a transaction before sending.
 * Returns false when another run already claimed it (primary key conflict).
 */
export async function claimBudgetAlert(
  client: SupabaseClient,
  transactionId: number,
  message: BudgetAlertMessage,
): Promise<boolean> {
  const { error } = await client.from('budget_alert_log').insert({
    transaction_id: transactionId,
    rules: message.rules,
    title: message.title,
    body: message.body,
  });
  if (!error) return true;
  if (error.code === '23505') return false;
  throw error;
}
