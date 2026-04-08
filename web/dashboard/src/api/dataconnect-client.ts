import { supabase } from '../lib/supabase';

export interface Transaction {
  id: number;
  txn_type: string;
  channel: string;
  amount: number;
  currency: string | null;
  merchant_name: string | null;
  txn_date: string;
  txn_timestamp: string | null;
  provider: string;
  card_last4: string | null;
  description: string | null;
  merchant?: {
    name: string;
    categoryId: number | null;
    categoryRef?: {
      id: number;
      name: string;
      icon: string;
      color: string;
    };
  };
  email: {
    sender_email: string;
    subject: string | null;
    received_at: string;
  };
}

export interface Merchant {
  id: number;
  name: string;
  categoryId: number | null;
  categoryRef?: {
    id: number;
    name: string;
    icon: string;
    color: string;
  };
  transaction_count: number | null;
  total_amount: number | null;
  inDatabase?: boolean;
}

export interface Stats {
  total_transactions: number;
  total_amount: number;
  payment_amount: number;
  payment_count: number;
  purchase_amount: number;
  purchase_count: number;
  this_month_amount: number;
  this_month_transactions: number;
  top_merchant: string | null;
  top_merchant_amount: number;
  providers: { provider: string; count: number }[];
}

export async function fetchTransactions(
  limit = 100,
  startDate?: string,
  endDate?: string
): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select(`
      id, txn_type, channel, amount, currency, merchant_name,
      txn_date, txn_timestamp, provider, card_last4, description,
      merchants ( name, category_id, categories ( id, name, icon, color ) ),
      emails ( sender_email, subject, received_at )
    `)
    .order('txn_date', { ascending: false })
    .limit(limit);

  if (startDate) query = query.gte('txn_date', startDate);
  if (endDate) query = query.lte('txn_date', endDate);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
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
    merchant: row.merchants ? {
      name: row.merchants.name,
      categoryId: row.merchants.category_id,
      categoryRef: row.merchants.categories ?? undefined,
    } : undefined,
    email: {
      sender_email: row.emails.sender_email,
      subject: row.emails.subject,
      received_at: row.emails.received_at,
    },
  }));
}

export async function fetchMerchantsPaginated(
  page = 1,
  pageSize = 50,
  searchTerm = '',
  categoryFilter = ''
): Promise<{ merchants: Merchant[]; totalCount: number; totalPages: number }> {
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('merchants')
    .select(`
      id, name, category_id, transaction_count, total_amount,
      categories ( id, name, icon, color )
    `, { count: 'exact' })
    .order('transaction_count', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);
  if (categoryFilter) query = query.eq('category_id', Number(categoryFilter));

  const { data, error, count } = await query;
  if (error) throw error;

  const merchants: Merchant[] = (data ?? []).map((m: any) => ({
    id: m.id,
    name: m.name,
    categoryId: m.category_id,
    categoryRef: m.categories ?? undefined,
    transaction_count: m.transaction_count ?? 0,
    total_amount: m.total_amount ? Number(m.total_amount) : 0,
    inDatabase: true,
  }));

  const totalCount = count ?? merchants.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  return { merchants, totalCount, totalPages };
}

export async function fetchMerchants(): Promise<Merchant[]> {
  const allMerchants: Merchant[] = [];
  let page = 1;

  while (true) {
    const { merchants, totalPages } = await fetchMerchantsPaginated(page, 1000);
    allMerchants.push(...merchants);
    if (page >= totalPages) break;
    page++;
  }

  return allMerchants;
}

export async function fetchStats(startDate?: string, endDate?: string): Promise<Stats> {
  const allTransactions = await fetchTransactions(10000, startDate, endDate);

  const total_transactions = allTransactions.length;
  let payment_amount = 0, payment_count = 0;
  let purchase_amount = 0, purchase_count = 0;

  allTransactions.forEach(txn => {
    if (txn.txn_type === 'PAYMENT') {
      payment_amount += txn.amount;
      payment_count += 1;
    } else if (txn.txn_type === 'PURCHASE') {
      purchase_amount += txn.amount;
      purchase_count += 1;
    }
  });

  const total_amount = payment_amount + purchase_amount;

  let this_month_amount = 0;
  let this_month_transactions = 0;

  if (!startDate && !endDate) {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTxns = allTransactions.filter(txn => new Date(txn.txn_date) >= firstDayOfMonth);
    this_month_transactions = monthTxns.length;
    this_month_amount = monthTxns.reduce((sum, txn) => {
      return (txn.txn_type === 'PURCHASE' || txn.txn_type === 'PAYMENT') ? sum + txn.amount : sum;
    }, 0);
  } else {
    this_month_amount = total_amount;
    this_month_transactions = total_transactions;
  }

  const providerMap = new Map<string, number>();
  const merchantMap = new Map<string, { count: number; amount: number }>();

  allTransactions.forEach(txn => {
    providerMap.set(txn.provider, (providerMap.get(txn.provider) ?? 0) + 1);

    const merchantName = txn.merchant_name ?? 'Unknown';
    const entry = merchantMap.get(merchantName) ?? { count: 0, amount: 0 };
    entry.count += 1;
    if (txn.txn_type === 'PURCHASE' || txn.txn_type === 'PAYMENT') {
      entry.amount += txn.amount;
    }
    merchantMap.set(merchantName, entry);
  });

  let top_merchant: string | null = null;
  let top_merchant_amount = 0;
  let maxCount = 0;
  merchantMap.forEach((stats, name) => {
    if (stats.count > maxCount) {
      maxCount = stats.count;
      top_merchant = name;
      top_merchant_amount = stats.amount;
    }
  });

  const providers = Array.from(providerMap.entries()).map(([provider, count]) => ({ provider, count }));

  return {
    total_transactions, total_amount,
    payment_amount, payment_count,
    purchase_amount, purchase_count,
    this_month_amount, this_month_transactions,
    top_merchant, top_merchant_amount,
    providers,
  };
}

export async function updateMerchantCategoryById(merchantId: number, categoryId: number): Promise<void> {
  const { error } = await supabase
    .from('merchants')
    .update({ category_id: categoryId })
    .eq('id', merchantId);
  if (error) throw error;
}

// ============================================
// MONTHLY CONTROL
// ============================================

export interface MonthlyIncome {
  id: number;
  year: number;
  month: number;
  source: string;
  amount: number;
  notes?: string;
}

export interface ManualTransaction {
  id: number;
  year: number;
  month: number;
  day?: number;
  description: string;
  amount: number;
  transactionType?: string;
  paymentMethod?: string;
  isPaid: boolean;
  notes?: string;
  merchantId?: number;
  categoryId?: number;
}

export async function fetchMonthlyIncomes(year: number, month: number): Promise<MonthlyIncome[]> {
  const { data, error } = await supabase
    .from('monthly_incomes')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .order('source');

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id, year: r.year, month: r.month,
    source: r.source, amount: Number(r.amount), notes: r.notes,
  }));
}

export async function createMonthlyIncome(income: Omit<MonthlyIncome, 'id'>): Promise<number> {
  const { data, error } = await supabase
    .from('monthly_incomes')
    .insert({
      year: income.year, month: income.month,
      source: income.source, amount: income.amount,
      notes: income.notes ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateMonthlyIncome(id: number, updates: Partial<MonthlyIncome>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.source !== undefined) patch.source = updates.source;
  if (updates.amount !== undefined) patch.amount = updates.amount;
  if (updates.notes !== undefined) patch.notes = updates.notes;

  const { error } = await supabase.from('monthly_incomes').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteMonthlyIncome(id: number): Promise<void> {
  const { error } = await supabase.from('monthly_incomes').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchManualTransactions(
  year: number,
  month: number,
  isPaid?: boolean
): Promise<ManualTransaction[]> {
  let query = supabase
    .from('manual_transactions')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .order('day', { ascending: true, nullsFirst: false });

  if (isPaid !== undefined) query = query.eq('is_paid', isPaid);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id, year: r.year, month: r.month, day: r.day,
    description: r.description, amount: Number(r.amount),
    transactionType: r.transaction_type, paymentMethod: r.payment_method,
    isPaid: r.is_paid, notes: r.notes,
    merchantId: r.merchant_id, categoryId: r.category_id,
  }));
}

export async function createManualTransaction(transaction: Omit<ManualTransaction, 'id'>): Promise<number> {
  const { data, error } = await supabase
    .from('manual_transactions')
    .insert({
      year: transaction.year, month: transaction.month, day: transaction.day ?? null,
      description: transaction.description, amount: transaction.amount,
      transaction_type: transaction.transactionType ?? null,
      payment_method: transaction.paymentMethod ?? null,
      is_paid: transaction.isPaid, notes: transaction.notes ?? null,
      merchant_id: transaction.merchantId ?? null,
      category_id: transaction.categoryId ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateManualTransaction(id: number, updates: Partial<ManualTransaction>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.day !== undefined) patch.day = updates.day;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.amount !== undefined) patch.amount = updates.amount;
  if (updates.transactionType !== undefined) patch.transaction_type = updates.transactionType;
  if (updates.paymentMethod !== undefined) patch.payment_method = updates.paymentMethod;
  if (updates.isPaid !== undefined) patch.is_paid = updates.isPaid;
  if (updates.notes !== undefined) patch.notes = updates.notes;
  if (updates.merchantId !== undefined) patch.merchant_id = updates.merchantId;
  if (updates.categoryId !== undefined) patch.category_id = updates.categoryId;

  const { error } = await supabase.from('manual_transactions').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteManualTransaction(id: number): Promise<void> {
  const { error } = await supabase.from('manual_transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleManualTransactionPaidStatus(id: number, isPaid: boolean): Promise<void> {
  const { error } = await supabase
    .from('manual_transactions')
    .update({ is_paid: isPaid })
    .eq('id', id);
  if (error) throw error;
}

export async function exportTransactionsCSV(startDate?: string, endDate?: string): Promise<Blob> {
  const transactions = await fetchTransactions(1000, startDate, endDate);

  const headers = ['Date', 'Merchant', 'Type', 'Channel', 'Amount', 'Currency', 'Provider', 'Card', 'Description'];
  const rows = transactions.map(txn => [
    txn.txn_date, txn.merchant_name ?? '', txn.txn_type, txn.channel,
    txn.amount.toString(), txn.currency ?? 'USD', txn.provider,
    txn.card_last4 ?? '', txn.description ?? '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return new Blob([csvContent], { type: 'text/csv' });
}

// ============================================
// PUSH NOTIFICATIONS
// ============================================

export async function createPushSubscription(data: {
  userEmail: string;
  endpoint: string;
  keys: string;
  userAgent?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .insert({
      user_email: data.userEmail,
      endpoint: data.endpoint,
      keys: JSON.parse(data.keys),
      user_agent: data.userAgent ?? null,
      is_active: true,
    });
  if (error) throw error;
}

export async function deactivatePushSubscription(data: { id: number }): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .update({ is_active: false })
    .eq('id', data.id);
  if (error) throw error;
}

export async function getActivePushSubscriptions(data: { userEmail: string }): Promise<any> {
  const { data: rows, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_email', data.userEmail)
    .eq('is_active', true);

  if (error) throw error;
  // Keep backward-compatible shape: { data: { pushSubscriptions: [...] } }
  return { data: { pushSubscriptions: rows ?? [] } };
}

export async function getMaxPushSubscriptionId(): Promise<any> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return { data: { pushSubscriptions: data ? [{ id: data.id }] : [] } };
}
