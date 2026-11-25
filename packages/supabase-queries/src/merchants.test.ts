import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { markMerchantOwnAccount, updateMerchantCategory } from './merchants.js';
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
