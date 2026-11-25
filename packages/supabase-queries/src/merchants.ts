import type { SupabaseClient } from '@supabase/supabase-js';
import type { Merchant } from './types.js';

function mapMerchantRow(m: any): Merchant {
  return {
    id: m.id,
    name: m.name,
    categoryId: m.category_id ?? null,
    categoryRef: m.category_ref_id
      ? {
          id: m.category_ref_id,
          name: m.category_ref_name,
          icon: m.category_ref_icon,
          color: m.category_ref_color,
        }
      : undefined,
    transaction_count: m.transaction_count ?? 0,
    total_amount: m.total_amount != null ? Number(m.total_amount) : 0,
    inDatabase: true,
    isOwnAccount: m.is_own_account === true,
  };
}

export async function fetchMerchantsPaginated(
  client: SupabaseClient,
  page = 1,
  pageSize = 50,
  searchTerm = '',
  categoryFilter = '',
): Promise<{ merchants: Merchant[]; totalCount: number; totalPages: number }> {
  const offset = (page - 1) * pageSize;

  let query = client
    .from('v_merchant_stats')
    .select('*', { count: 'exact' })
    .order('transaction_count', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);
  if (categoryFilter) query = query.eq('category_id', Number(categoryFilter));

  const { data, error, count } = await query;
  if (error) throw error;

  const merchants = (data ?? []).map(mapMerchantRow);
  const totalCount = count ?? merchants.length;

  return { merchants, totalCount, totalPages: Math.ceil(totalCount / pageSize) };
}

export async function fetchMerchants(client: SupabaseClient): Promise<Merchant[]> {
  const all: Merchant[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { merchants, totalPages } = await fetchMerchantsPaginated(client, page, 1000);
    all.push(...merchants);
    hasMore = page < totalPages;
    page++;
  }

  return all;
}

export async function updateMerchantCategory(
  client: SupabaseClient,
  merchantId: number,
  categoryId: number,
): Promise<void> {
  // A merchant with a category is not an own account
  // (CHECK merchants_own_account_no_category).
  const { error } = await client
    .from('merchants')
    .update({ category_id: categoryId, is_own_account: false })
    .eq('id', merchantId);
  if (error) throw error;
}

/**
 * Marks a merchant as one of the owner's own accounts: its transfers stop
 * counting against budgets and category reports, so it loses its category.
 */
export async function markMerchantOwnAccount(
  client: SupabaseClient,
  merchantId: number,
): Promise<void> {
  const { error } = await client
    .from('merchants')
    .update({ category_id: null, is_own_account: true })
    .eq('id', merchantId);
  if (error) throw error;
}
