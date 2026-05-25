import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Transaction,
  TransactionFilters,
  PaginatedTransactionsResult,
  TransactionSummary,
} from './types.js';

// Selects all columns exposed by the v_transactions view.
const V_TXN_SELECT = [
  'id', 'txn_type', 'channel', 'amount', 'currency', 'merchant_name',
  'txn_date', 'txn_timestamp', 'provider', 'card_last4', 'description',
  'merchant_normalized_name', 'merchant_category_id',
  'category_id', 'category_name', 'category_icon', 'category_color',
  'email_sender', 'email_subject', 'email_received_at',
].join(', ');

export function mapTransactionRow(row: any): Transaction {
  return {
    id: row.id,
    txn_type: row.txn_type,
    channel: row.channel,
    amount: Number(row.amount),
    currency: row.currency,
    merchant_name: row.merchant_name,
    txn_date: row.txn_date,
    txn_timestamp: row.txn_timestamp,
    provider: row.provider,
    card_last4: row.card_last4,
    description: row.description,
    merchant: row.merchant_normalized_name
      ? {
          name: row.merchant_normalized_name,
          categoryId: row.merchant_category_id ?? null,
          categoryRef: row.category_id
            ? {
                id: row.category_id,
                name: row.category_name,
                icon: row.category_icon,
                color: row.category_color,
              }
            : undefined,
        }
      : undefined,
    email: {
      sender_email: row.email_sender,
      subject: row.email_subject,
      received_at: row.email_received_at,
    },
  };
}

function applyDateRange(query: any, startDate?: string, endDate?: string) {
  if (startDate) query = query.gte('txn_date', startDate);
  if (endDate) query = query.lte('txn_date', endDate);
  return query;
}

function applyFilters(query: any, filters: TransactionFilters = {}) {
  const searchTerm = filters.searchTerm?.trim();
  if (searchTerm) {
    query = query.or(`merchant_name.ilike.%${searchTerm}%,card_last4.ilike.%${searchTerm}%`);
  }
  if (filters.typeFilter && filters.typeFilter !== 'all') {
    query = query.eq('txn_type', filters.typeFilter);
  }
  if (filters.channelFilter && filters.channelFilter !== 'all') {
    query = query.eq('channel', filters.channelFilter);
  }
  if (filters.providerFilter && filters.providerFilter !== 'all') {
    query = query.eq('provider', filters.providerFilter);
  }
  return query;
}

async function fetchRowsInBatches(
  client: SupabaseClient,
  select: string,
  filters: TransactionFilters = {},
  startDate?: string,
  endDate?: string,
  batchSize = 1000,
): Promise<any[]> {
  const rows: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = client
      .from('v_transactions')
      .select(select)
      .order('txn_date', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + batchSize - 1);

    query = applyDateRange(query, startDate, endDate);
    query = applyFilters(query, filters);

    const { data, error } = await query;
    if (error) throw error;

    const batch = data ?? [];
    rows.push(...batch);
    hasMore = batch.length === batchSize;
    from += batchSize;
  }

  return rows;
}

export async function fetchTransactions(
  client: SupabaseClient,
  limit = 100,
  startDate?: string,
  endDate?: string,
): Promise<Transaction[]> {
  let query = client
    .from('v_transactions')
    .select(V_TXN_SELECT)
    .order('txn_date', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  query = applyDateRange(query, startDate, endDate);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map(mapTransactionRow);
}

export async function fetchTransactionsPaginated(
  client: SupabaseClient,
  page = 1,
  pageSize = 25,
  filters: TransactionFilters = {},
  startDate?: string,
  endDate?: string,
): Promise<PaginatedTransactionsResult> {
  const offset = (page - 1) * pageSize;

  let query = client
    .from('v_transactions')
    .select(V_TXN_SELECT, { count: 'exact' })
    .order('txn_date', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + pageSize - 1);

  query = applyDateRange(query, startDate, endDate);
  query = applyFilters(query, filters);

  const { data, error, count } = await query;
  if (error) throw error;

  const transactions = (data ?? []).map(mapTransactionRow);
  const totalCount = count ?? 0;

  return {
    transactions,
    totalCount,
    totalPages: totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0,
  };
}

export async function fetchTransactionSummary(
  client: SupabaseClient,
  filters: TransactionFilters = {},
  startDate?: string,
  endDate?: string,
): Promise<TransactionSummary> {
  const rows = await fetchRowsInBatches(
    client,
    'merchant_name, amount',
    filters,
    startDate,
    endDate,
  );

  const merchantMap = new Map<string, { count: number; amount: number }>();
  let totalAmount = 0;

  for (const row of rows) {
    const amount = Number(row.amount) || 0;
    totalAmount += amount;
    const name = row.merchant_name ?? 'Unknown';
    const entry = merchantMap.get(name) ?? { count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += amount;
    merchantMap.set(name, entry);
  }

  let topMerchant: string | null = null;
  let topMerchantAmount = 0;
  let topMerchantCount = 0;

  for (const [name, stats] of merchantMap) {
    if (
      stats.count > topMerchantCount ||
      (stats.count === topMerchantCount && stats.amount > topMerchantAmount)
    ) {
      topMerchant = name;
      topMerchantAmount = stats.amount;
      topMerchantCount = stats.count;
    }
  }

  return { totalCount: rows.length, totalAmount, topMerchant, topMerchantAmount, topMerchantCount };
}

export async function fetchTransactionFilterOptions(
  client: SupabaseClient,
  startDate?: string,
  endDate?: string,
): Promise<{ types: string[]; channels: string[]; providers: string[] }> {
  const rows = await fetchRowsInBatches(client, 'txn_type, channel, provider', {}, startDate, endDate);

  const types = new Set<string>();
  const channels = new Set<string>();
  const providers = new Set<string>();

  for (const row of rows) {
    if (row.txn_type) types.add(row.txn_type);
    if (row.channel) channels.add(row.channel);
    if (row.provider) providers.add(row.provider);
  }

  return {
    types: Array.from(types).sort((a, b) => a.localeCompare(b)),
    channels: Array.from(channels).sort((a, b) => a.localeCompare(b)),
    providers: Array.from(providers).sort((a, b) => a.localeCompare(b)),
  };
}

export async function exportTransactionsCSV(
  client: SupabaseClient,
  startDate?: string,
  endDate?: string,
  filters: TransactionFilters = {},
): Promise<Blob> {
  const rows = await fetchRowsInBatches(client, V_TXN_SELECT, filters, startDate, endDate);
  const transactions = rows.map(mapTransactionRow);

  const headers = ['Date', 'Merchant', 'Type', 'Channel', 'Amount', 'Currency', 'Provider', 'Card', 'Description'];
  const csvRows = transactions.map(txn => [
    txn.txn_date, txn.merchant_name ?? '', txn.txn_type, txn.channel,
    txn.amount.toString(), txn.currency ?? 'USD', txn.provider,
    txn.card_last4 ?? '', txn.description ?? '',
  ]);

  const csvContent = [
    headers.join(','),
    ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return new Blob([csvContent], { type: 'text/csv' });
}
