import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { claimBudgetAlert, fetchBudgetAlertCandidates, fetchBudgetStatus, mapAlertSettings } from './budgets.js';

const message = { rules: ['budget_ok' as const], title: 't', body: 'b' };

function insertClient(error: unknown) {
  return { from: () => ({ insert: async () => ({ error }) }) } as unknown as SupabaseClient;
}

describe('fetchBudgetStatus', () => {
  it('maps numeric strings from Postgres and passes the date', async () => {
    let args: unknown;
    const client = {
      rpc: async (_name: string, a: unknown) => {
        args = a;
        return {
          data: [{
            category_id: 1, label: 'Comida fuera', emoji: '☕', monthly_limit: '200.00',
            spent: '112.40', remaining: '87.60', pct: '56.20', days_left: 9,
          }],
          error: null,
        };
      },
    } as unknown as SupabaseClient;

    const rows = await fetchBudgetStatus(client, '2026-11-21');
    expect(args).toEqual({ p_as_of: '2026-11-21' });
    expect(rows).toEqual([{
      categoryId: 1, label: 'Comida fuera', emoji: '☕', monthlyLimit: 200,
      spent: 112.4, remaining: 87.6, pct: 56.2, daysLeft: 9,
    }]);
  });

  it('lets the database pick today when no date is given', async () => {
    let args: unknown;
    const client = { rpc: async (_n: string, a: unknown) => { args = a; return { data: [], error: null }; } } as unknown as SupabaseClient;
    await fetchBudgetStatus(client);
    expect(args).toEqual({});
  });
});

describe('claimBudgetAlert', () => {
  it('returns true when the row is new', async () => {
    expect(await claimBudgetAlert(insertClient(null), 1, message)).toBe(true);
  });

  it('returns false when another run already claimed it', async () => {
    expect(await claimBudgetAlert(insertClient({ code: '23505', message: 'duplicate key' }), 1, message)).toBe(false);
  });

  it('throws any other error', async () => {
    const error = { code: '42501', message: 'permission denied' };
    await expect(claimBudgetAlert(insertClient(error), 1, message)).rejects.toBe(error);
  });
});

describe('fetchBudgetAlertCandidates', () => {
  function candidateClient(txnIds: number[], loggedIds: number[], filters: unknown[][]) {
    const txnQuery: any = {
      select: () => txnQuery,
      gte: (...a: unknown[]) => { filters.push(['gte', ...a]); return txnQuery; },
      in: (...a: unknown[]) => { filters.push(['in', ...a]); return txnQuery; },
      order: () => txnQuery,
      limit: async () => ({ data: txnIds.map((id) => ({ id })), error: null }),
    };
    const logQuery: any = {
      select: () => logQuery,
      in: async () => ({ data: loggedIds.map((transaction_id) => ({ transaction_id })), error: null }),
    };
    return { from: (table: string) => (table === 'transactions' ? txnQuery : logQuery) } as unknown as SupabaseClient;
  }

  it('filters by creation time, dates and types, and drops already alerted ids', async () => {
    const filters: unknown[][] = [];
    const ids = await fetchBudgetAlertCandidates(candidateClient([3, 4, 5], [4], filters), {
      createdSince: '2026-11-21T12:00:00.000Z',
      txnDates: ['2026-11-20', '2026-11-21'],
      txnTypes: ['PURCHASE', 'TRANSFER'],
    });

    expect(ids).toEqual([3, 5]);
    expect(filters).toEqual([
      ['gte', 'created_at', '2026-11-21T12:00:00.000Z'],
      ['in', 'txn_date', ['2026-11-20', '2026-11-21']],
      ['in', 'txn_type', ['PURCHASE', 'TRANSFER']],
    ]);
  });

  it('skips the log lookup when there are no candidates', async () => {
    const filters: unknown[][] = [];
    const ids = await fetchBudgetAlertCandidates(candidateClient([], [], filters), {
      createdSince: 'x', txnDates: [], txnTypes: [],
    });
    expect(ids).toEqual([]);
  });
});

describe('mapAlertSettings', () => {
  it('converts the numeric threshold and card list', () => {
    expect(mapAlertSettings({
      alerts_enabled: true, notify_every_purchase: false, big_purchase_threshold: '100.00', frozen_cards: ['1111'],
    })).toEqual({ alertsEnabled: true, notifyEveryPurchase: false, bigPurchaseThreshold: 100, frozenCards: ['1111'] });
  });
});
