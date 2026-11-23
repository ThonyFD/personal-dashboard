import { describe, expect, it, vi } from 'vitest';
import type { AlertTransactionRow, BudgetStatus } from '@personal-dashboard/supabase-queries';
import { processBudgetAlerts, processBudgetAlertsSafely, type BudgetAlertDeps } from './budget-alerts';

// Made-up values only.
const NOW = new Date('2026-11-21T15:00:00Z');

function txnRow(overrides: Partial<AlertTransactionRow> = {}): AlertTransactionRow {
  return {
    id: 1, amount: 12, txnType: 'PURCHASE', txnDate: '2026-11-21',
    merchantName: 'CAFE TEST', cardLast4: '9999', categoryId: 1, ...overrides,
  };
}

const statusRow: BudgetStatus = {
  categoryId: 1, label: 'Comida fuera', emoji: '☕', monthlyLimit: 200,
  spent: 62, remaining: 138, pct: 31, daysLeft: 10,
};

function deps(overrides: Partial<BudgetAlertDeps> = {}): BudgetAlertDeps {
  return {
    fetchSettings: vi.fn(async () => ({ alertsEnabled: true, notifyEveryPurchase: true, bigPurchaseThreshold: 100, frozenCards: [] })),
    fetchTransaction: vi.fn(async (id: number) => txnRow({ id })),
    fetchStatus: vi.fn(async () => [statusRow]),
    hasAlert: vi.fn(async () => false),
    claim: vi.fn(async () => true),
    push: vi.fn(async () => ({ sent: 1, failed: 0, deactivated: 0 })),
    ...overrides,
  };
}

describe('processBudgetAlerts', () => {
  it('claims, then pushes with a per-transaction tag and the budgets link', async () => {
    const d = deps();
    const out = await processBudgetAlerts([7], d, { now: NOW, dashboardUrl: 'https://example.test' });

    expect(out).toEqual([{ transactionId: 7, status: 'sent', rules: ['budget_ok'], delivered: 1 }]);
    expect(d.fetchStatus).toHaveBeenCalledWith('2026-11-21');
    expect(d.claim).toHaveBeenCalledTimes(1);
    expect(d.push).toHaveBeenCalledWith({
      title: '☕ Comida fuera',
      body: '$62.00 de $200.00 · te quedan $138.00 para 10 días',
      tag: 'budget-alert-7',
      link: 'https://example.test/finance/budgets',
    });
  });

  it('skips a transaction that already has a log row', async () => {
    const d = deps({ hasAlert: vi.fn(async () => true) });
    const out = await processBudgetAlerts([7], d, { now: NOW });
    expect(out).toEqual([{ transactionId: 7, status: 'skipped', reason: 'duplicate' }]);
    expect(d.claim).not.toHaveBeenCalled();
    expect(d.push).not.toHaveBeenCalled();
  });

  it('skips when another run wins the claim', async () => {
    const d = deps({ claim: vi.fn(async () => false) });
    const out = await processBudgetAlerts([7], d, { now: NOW });
    expect(out[0]).toEqual({ transactionId: 7, status: 'skipped', reason: 'duplicate' });
    expect(d.push).not.toHaveBeenCalled();
  });

  it('skips without a rule and without sending', async () => {
    const d = deps({ fetchTransaction: vi.fn(async (id: number) => txnRow({ id, categoryId: 99 })) });
    const out = await processBudgetAlerts([7], d, { now: NOW });
    expect(out).toEqual([{ transactionId: 7, status: 'skipped', reason: 'no_rule' }]);
    expect(d.claim).not.toHaveBeenCalled();
  });

  it('dry run returns the message and writes nothing, even if already sent', async () => {
    const d = deps({ hasAlert: vi.fn(async () => true) });
    const out = await processBudgetAlerts([7], d, { now: NOW, dryRun: true });
    expect(out).toEqual([{
      transactionId: 7, status: 'dry_run', rules: ['budget_ok'], alreadySent: true,
      title: '☕ Comida fuera', body: '$62.00 de $200.00 · te quedan $138.00 para 10 días',
    }]);
    expect(d.claim).not.toHaveBeenCalled();
    expect(d.push).not.toHaveBeenCalled();
  });

  it('marks a push that reached nobody as failed', async () => {
    const d = deps({ push: vi.fn(async () => ({ sent: 0, failed: 2, deactivated: 0 })) });
    const out = await processBudgetAlerts([7], d, { now: NOW });
    expect(out[0]).toEqual({ transactionId: 7, status: 'failed', reason: 'no_delivery' });
  });

  it('keeps going after one transaction fails', async () => {
    const d = deps({
      fetchTransaction: vi.fn(async (id: number) => {
        if (id === 1) throw new Error('boom');
        return txnRow({ id });
      }),
    });
    const out = await processBudgetAlerts([1, 2], d, { now: NOW });
    expect(out.map((o) => o.status)).toEqual(['failed', 'sent']);
  });

  it('reads budget_status() once per as-of date', async () => {
    const d = deps();
    await processBudgetAlerts([1, 2, 3], d, { now: NOW });
    expect(d.fetchStatus).toHaveBeenCalledTimes(1);
  });

  it('evaluates last month at its last day', async () => {
    const d = deps({ fetchTransaction: vi.fn(async (id: number) => txnRow({ id, txnDate: '2026-11-30' })) });
    await processBudgetAlerts([1], d, { now: new Date('2026-12-01T13:00:00Z') });
    expect(d.fetchStatus).toHaveBeenCalledWith('2026-11-30');
  });

  it('skips everything when the settings row is missing', async () => {
    const d = deps({ fetchSettings: vi.fn(async () => null) });
    const out = await processBudgetAlerts([1, 2], d, { now: NOW });
    expect(out.map((o) => o.status)).toEqual(['skipped', 'skipped']);
  });
});

describe('processBudgetAlertsSafely', () => {
  it('never throws, even when the settings cannot be read', async () => {
    const d = deps({ fetchSettings: vi.fn(async () => { throw new Error('db down'); }) });
    const out = await processBudgetAlertsSafely([1], d, { now: NOW });
    expect(out).toEqual([{ transactionId: 1, status: 'failed', reason: 'db down' }]);
  });
});
