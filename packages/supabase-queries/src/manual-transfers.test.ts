import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  MANUAL_PROVIDER,
  deleteManualTransfer,
  isManualTransaction,
  recordManualTransfer,
} from './manual-transfers.js';
import { buildBudgetAlert, type AlertSettings, type AlertTransaction, type BudgetStatus } from './budget-alerts.js';
import { fetchAlertTransaction } from './budgets.js';

const input = {
  merchantId: 42,
  merchantName: 'KG',
  amount: 25,
  txnDate: '2026-11-25',
  idempotencyKey: 'abc-123',
};

function insertClient(result: { data?: unknown; error?: unknown }, existingId?: number) {
  const inserted: unknown[] = [];
  const lookups: { column: string; value: unknown }[] = [];
  const client = {
    from: (_table: string) => ({
      insert: (row: unknown) => {
        inserted.push(row);
        return {
          select: () => ({
            single: async () => ({ data: result.data ?? null, error: result.error ?? null }),
          }),
        };
      },
      select: () => ({
        eq: (column: string, value: unknown) => {
          lookups.push({ column, value });
          return {
            maybeSingle: async () => ({ data: existingId ? { id: existingId } : null, error: null }),
          };
        },
      }),
    }),
  } as unknown as SupabaseClient;
  return { client, inserted, lookups };
}

describe('recordManualTransfer', () => {
  it('stores a bank transfer without an email, marked as manual', async () => {
    const { client, inserted } = insertClient({ data: { id: 900 } });

    const id = await recordManualTransfer(client, input);

    expect(id).toBe(900);
    expect(inserted).toEqual([
      {
        email_id: null,
        merchant_id: 42,
        merchant_name: 'KG',
        merchant_raw: 'KG',
        txn_type: 'TRANSFER',
        channel: 'BANK_TRANSFER',
        amount: 25,
        currency: 'USD',
        txn_date: '2026-11-25',
        provider: MANUAL_PROVIDER,
        description: null,
        idempotency_key: 'manual:abc-123',
      },
    ]);
  });

  it('keeps a trimmed description and drops a blank one', async () => {
    const first = insertClient({ data: { id: 1 } });
    await recordManualTransfer(first.client, { ...input, description: '  almuerzo cliente  ' });
    expect((first.inserted[0] as any).description).toBe('almuerzo cliente');

    const second = insertClient({ data: { id: 2 } });
    await recordManualTransfer(second.client, { ...input, description: '   ' });
    expect((second.inserted[0] as any).description).toBeNull();
  });

  it('a second submit with the same key returns the row already saved', async () => {
    const { client, lookups } = insertClient({ error: { code: '23505', message: 'duplicate key' } }, 900);

    const id = await recordManualTransfer(client, input);

    expect(id).toBe(900);
    expect(lookups).toEqual([{ column: 'idempotency_key', value: 'manual:abc-123' }]);
  });

  it('rethrows any other database error', async () => {
    const { client } = insertClient({ error: { code: '42501', message: 'permission denied' } });
    await expect(recordManualTransfer(client, input)).rejects.toMatchObject({ code: '42501' });
  });

  it.each([
    ['a zero amount', { amount: 0 }],
    ['a negative amount', { amount: -5 }],
    ['an amount that is not a number', { amount: Number.NaN }],
    ['a date that is not YYYY-MM-DD', { txnDate: '25/11/2026' }],
    ['a merchant id that is not a positive integer', { merchantId: 0 }],
    ['an empty idempotency key', { idempotencyKey: '' }],
  ])('rejects %s before touching the database', async (_label, patch) => {
    const { client, inserted } = insertClient({ data: { id: 1 } });
    await expect(recordManualTransfer(client, { ...input, ...patch })).rejects.toThrow();
    expect(inserted).toEqual([]);
  });

  it('rounds the amount to cents', async () => {
    const { client, inserted } = insertClient({ data: { id: 1 } });
    await recordManualTransfer(client, { ...input, amount: 10.005 });
    expect((inserted[0] as any).amount).toBe(10.01);
  });
});

describe('deleteManualTransfer', () => {
  it('only deletes rows whose provider is manual', async () => {
    const filters: [string, unknown][] = [];
    const chain = {
      eq(column: string, value: unknown) {
        filters.push([column, value]);
        return filters.length === 2 ? Promise.resolve({ error: null }) : chain;
      },
    };
    let table = '';
    const client = {
      from: (t: string) => {
        table = t;
        return { delete: () => chain };
      },
    } as unknown as SupabaseClient;

    await deleteManualTransfer(client, 900);

    expect(table).toBe('transactions');
    expect(filters).toEqual([
      ['id', 900],
      ['provider', MANUAL_PROVIDER],
    ]);
  });
});

describe('isManualTransaction', () => {
  it('is true only for the manual provider', () => {
    expect(isManualTransaction('manual')).toBe(true);
    expect(isManualTransaction('yappy')).toBe(false);
    expect(isManualTransaction(null)).toBe(false);
    expect(isManualTransaction(undefined)).toBe(false);
  });
});

describe('budget alerts for manual entries', () => {
  const settings: AlertSettings = {
    alertsEnabled: true,
    notifyEveryPurchase: true,
    bigPurchaseThreshold: 100,
    frozenCards: [],
  };
  const budget: BudgetStatus = {
    categoryId: 22,
    label: 'Representación',
    emoji: '🤝',
    monthlyLimit: 200,
    spent: 150,
    remaining: 50,
    pct: 75,
    daysLeft: 6,
  };

  it('never pushes for a transfer the owner typed in', () => {
    const txn: AlertTransaction = {
      id: 900,
      amount: 150,
      txnType: 'TRANSFER',
      merchantName: 'KG',
      cardLast4: null,
      categoryId: 22,
      isManual: true,
    };
    expect(buildBudgetAlert(txn, settings, budget)).toEqual({ send: false, reason: 'manual' });
  });

  it('the alert path reads the provider to know an entry is manual', async () => {
    let selected = '';
    const client = {
      from: () => ({
        select: (columns: string) => {
          selected = columns;
          return {
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 900, amount: '25', txn_type: 'TRANSFER', txn_date: '2026-11-25', merchant_name: 'KG',
                  card_last4: null, merchant_category_id: 22, merchant_is_own_account: false, provider: 'manual',
                },
                error: null,
              }),
            }),
          };
        },
      }),
    } as unknown as SupabaseClient;

    const txn = await fetchAlertTransaction(client, 900);

    expect(selected).toContain('provider');
    expect(txn?.isManual).toBe(true);
  });
});
