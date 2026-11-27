import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  computeBusiestMerchant,
  computeTopMerchant,
  fetchTransactionSummary,
  isOwnAccountTransfer,
  isSpending,
  mapTransactionRow,
} from './transactions.js';

// Query builder stand-in: every call chains, awaiting it gives the rows.
function rowsClient(rows: unknown[]) {
  const selects: string[] = [];
  const builder: any = new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === 'then') return (resolve: (v: unknown) => void) => resolve({ data: rows, error: null });
        if (prop === 'select') return (columns: string) => {
          selects.push(columns);
          return builder;
        };
        return () => builder;
      },
    },
  );
  const client = { from: () => builder } as unknown as SupabaseClient;
  return { client, selects };
}

const own = { merchant_name: 'OWN SAVINGS', amount: 500, txn_type: 'TRANSFER', merchant_is_own_account: true };
const cafe = { merchant_name: 'CAFE', amount: 12, txn_type: 'PURCHASE', merchant_is_own_account: false };
const cafe2 = { merchant_name: 'CAFE', amount: 8, txn_type: 'PURCHASE', merchant_is_own_account: false };
const friend = { merchant_name: 'FRIEND', amount: 40, txn_type: 'TRANSFER', merchant_is_own_account: false };
const refund = { merchant_name: 'CAFE', amount: 5, txn_type: 'REFUND', merchant_is_own_account: false };

describe('isSpending', () => {
  it('counts debit types', () => {
    expect(isSpending(cafe)).toBe(true);
    expect(isSpending(friend)).toBe(true);
  });

  it('never counts a transfer between own accounts', () => {
    expect(isOwnAccountTransfer(own)).toBe(true);
    expect(isSpending(own)).toBe(false);
  });

  it('does not count refunds or income', () => {
    expect(isSpending(refund)).toBe(false);
    expect(isSpending({ ...cafe, txn_type: 'INCOME' })).toBe(false);
  });

  it('reads the flag from a mapped Transaction too', () => {
    const mapped = mapTransactionRow({
      id: 1,
      txn_type: 'TRANSFER',
      amount: '500',
      merchant_normalized_name: 'OWN SAVINGS',
      merchant_is_own_account: true,
    });
    expect(isOwnAccountTransfer(mapped)).toBe(true);
    expect(isSpending(mapped)).toBe(false);
  });
});

describe('top and busiest merchant', () => {
  it('an own account never wins top merchant, even with the biggest amount', () => {
    expect(computeTopMerchant([own, cafe, friend])).toEqual({
      topMerchant: 'FRIEND',
      topMerchantAmount: 40,
      topMerchantCount: 1,
    });
  });

  it('an own account never wins busiest merchant, even with the most rows', () => {
    expect(computeBusiestMerchant([own, own, own, cafe, cafe2]).busiestMerchant).toBe('CAFE');
  });
});

describe('fetchTransactionSummary', () => {
  it('leaves own-account transfers out of the total amount but keeps them in the count', async () => {
    const { client, selects } = rowsClient([own, cafe, friend]);
    const summary = await fetchTransactionSummary(client);
    expect(selects[0]).toContain('merchant_is_own_account');
    expect(summary.totalAmount).toBe(52);
    expect(summary.totalCount).toBe(3);
    expect(summary.topMerchant).toBe('FRIEND');
  });
});
