import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchMerchantsPaginated,
  markMerchantOwnAccount,
  updateMerchantCategory,
} from './merchants.js';
import { mapTransactionRow } from './transactions.js';
import { fetchAlertTransaction } from './budgets.js';

function updateClient() {
  const calls: { table: string; values: unknown; id: unknown }[] = [];
  const client = {
    from: (table: string) => ({
      update: (values: unknown) => ({
        eq: async (_column: string, id: unknown) => {
          calls.push({ table, values, id });
          return { error: null };
        },
      }),
    }),
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe('own-account merchants', () => {
  it('marking an own account also clears its category', async () => {
    const { client, calls } = updateClient();
    await markMerchantOwnAccount(client, 7);
    expect(calls).toEqual([{ table: 'merchants', values: { category_id: null, is_own_account: true }, id: 7 }]);
  });

  it('giving a merchant a category unmarks it as an own account', async () => {
    const { client, calls } = updateClient();
    await updateMerchantCategory(client, 7, 3);
    expect(calls).toEqual([{ table: 'merchants', values: { category_id: 3, is_own_account: false }, id: 7 }]);
  });

  it('maps the own-account flag from v_transactions', () => {
    const base = { id: 1, txn_type: 'TRANSFER', amount: '10', merchant_normalized_name: 'X', merchant_category_id: null };
    expect(mapTransactionRow({ ...base, merchant_is_own_account: true }).merchant?.isOwnAccount).toBe(true);
    expect(mapTransactionRow({ ...base, merchant_is_own_account: false }).merchant?.isOwnAccount).toBe(false);
  });

  it('the alert path reads the own-account flag', async () => {
    let selected = '';
    const client = {
      from: () => ({
        select: (columns: string) => {
          selected = columns;
          return {
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 5, amount: '300', txn_type: 'TRANSFER', txn_date: '2026-11-25', merchant_name: 'X',
                  card_last4: null, merchant_category_id: null, merchant_is_own_account: true,
                },
                error: null,
              }),
            }),
          };
        },
      }),
    } as unknown as SupabaseClient;

    const txn = await fetchAlertTransaction(client, 5);
    expect(selected).toContain('merchant_is_own_account');
    expect(txn?.isOwnAccount).toBe(true);
  });
});

/** Records every builder call of a v_merchant_stats select and resolves with `rows`. */
function selectClient(rows: unknown[] = []) {
  const calls: { method: string; args: unknown[] }[] = [];
  const builder: any = {};
  for (const method of ['select', 'order', 'range', 'ilike', 'eq']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => unknown) =>
    resolve({ data: rows, error: null, count: rows.length });
  const client = {
    from: (table: string) => {
      calls.push({ method: 'from', args: [table] });
      return builder;
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

const orders = (calls: { method: string; args: unknown[] }[]) =>
  calls.filter((c) => c.method === 'order').map((c) => c.args);

describe('merchant sorting', () => {
  it('keeps most used first by default, ties by id', async () => {
    const { client, calls } = selectClient();
    await fetchMerchantsPaginated(client);
    expect(orders(calls)).toEqual([
      ['transaction_count', { ascending: false, nullsFirst: false }],
      ['id', { ascending: true }],
    ]);
  });

  it.each([
    ['name', 'name'],
    ['category', 'category_ref_name'],
    ['transaction_count', 'transaction_count'],
    ['total_amount', 'total_amount'],
    ['avg_amount', 'avg_amount'],
    ['last_txn_date', 'last_txn_date'],
  ] as const)('sorts %s by view column %s, empty values last', async (key, column) => {
    const { client, calls } = selectClient();
    await fetchMerchantsPaginated(client, 2, 50, '', '', { key, ascending: true });
    expect(orders(calls)[0]).toEqual([column, { ascending: true, nullsFirst: false }]);
    expect(calls.find((c) => c.method === 'range')?.args).toEqual([50, 99]);
  });

  it('maps average and last transaction date', async () => {
    const { client } = selectClient([
      { id: 1, name: 'A', transaction_count: 4, total_amount: '20', avg_amount: '5', last_txn_date: '2026-11-20' },
      { id: 2, name: 'B', transaction_count: 0, total_amount: '0', avg_amount: '0', last_txn_date: null },
    ]);
    const { merchants } = await fetchMerchantsPaginated(client);
    expect(merchants.map((m) => [m.avg_amount, m.last_txn_date])).toEqual([
      [5, '2026-11-20'],
      [0, null],
    ]);
  });
});
