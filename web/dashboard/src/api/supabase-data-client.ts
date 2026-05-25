import { supabase } from '../lib/supabase';
import {
  fetchTransactions as _fetchTransactions,
  fetchTransactionsPaginated as _fetchTransactionsPaginated,
  fetchTransactionSummary as _fetchTransactionSummary,
  fetchTransactionFilterOptions as _fetchTransactionFilterOptions,
  exportTransactionsCSV as _exportTransactionsCSV,
  fetchMerchants as _fetchMerchants,
  fetchMerchantsPaginated as _fetchMerchantsPaginated,
  updateMerchantCategory as _updateMerchantCategory,
  fetchMonthlyIncomes as _fetchMonthlyIncomes,
  fetchMonthlyIncomesInRange as _fetchMonthlyIncomesInRange,
  createMonthlyIncome as _createMonthlyIncome,
  updateMonthlyIncome as _updateMonthlyIncome,
  deleteMonthlyIncome as _deleteMonthlyIncome,
  fetchManualTransactions as _fetchManualTransactions,
  createManualTransaction as _createManualTransaction,
  updateManualTransaction as _updateManualTransaction,
  deleteManualTransaction as _deleteManualTransaction,
  toggleManualTransactionPaid as _toggleManualTransactionPaid,
  createPushSubscription as _createPushSubscription,
  deactivateSubscription as _deactivateSubscription,
  getActivePushSubscriptionsByEmail as _getActivePushSubscriptionsByEmail,
  getMaxPushSubscriptionId as _getMaxPushSubscriptionId,
} from '@personal-dashboard/supabase-queries';

// Re-export types consumed by web components
export type {
  Transaction,
  TransactionFilters,
  PaginatedTransactionsResult,
  TransactionSummary,
  Merchant,
  MonthlyIncome,
  ManualTransaction,
} from '@personal-dashboard/supabase-queries';

// ─── Stats (web-only aggregation, not shared) ─────────────────────────────────

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
  transactions: import('@personal-dashboard/supabase-queries').Transaction[];
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export const fetchTransactions = (limit = 100, startDate?: string, endDate?: string) =>
  _fetchTransactions(supabase, limit, startDate, endDate);

export const fetchTransactionsPaginated = (
  page = 1,
  pageSize = 25,
  filters: import('@personal-dashboard/supabase-queries').TransactionFilters = {},
  startDate?: string,
  endDate?: string,
) => _fetchTransactionsPaginated(supabase, page, pageSize, filters, startDate, endDate);

export const fetchTransactionSummary = (
  filters: import('@personal-dashboard/supabase-queries').TransactionFilters = {},
  startDate?: string,
  endDate?: string,
) => _fetchTransactionSummary(supabase, filters, startDate, endDate);

export const fetchTransactionFilterOptions = (startDate?: string, endDate?: string) =>
  _fetchTransactionFilterOptions(supabase, startDate, endDate);

export const exportTransactionsCSV = (
  startDate?: string,
  endDate?: string,
  filters: import('@personal-dashboard/supabase-queries').TransactionFilters = {},
) => _exportTransactionsCSV(supabase, startDate, endDate, filters);

// ─── Merchants ────────────────────────────────────────────────────────────────

export const fetchMerchantsPaginated = (
  page = 1,
  pageSize = 50,
  searchTerm = '',
  categoryFilter = '',
) => _fetchMerchantsPaginated(supabase, page, pageSize, searchTerm, categoryFilter);

export const fetchMerchants = () => _fetchMerchants(supabase);

export const updateMerchantCategoryById = (merchantId: number, categoryId: number) =>
  _updateMerchantCategory(supabase, merchantId, categoryId);

// ─── Stats (web-only) ─────────────────────────────────────────────────────────

export async function fetchStats(startDate?: string, endDate?: string): Promise<Stats> {
  const allTransactions = await _fetchTransactions(supabase, 10000, startDate, endDate);

  const total_transactions = allTransactions.length;
  let payment_amount = 0, payment_count = 0;
  let purchase_amount = 0, purchase_count = 0;

  for (const txn of allTransactions) {
    if (txn.txn_type === 'PAYMENT') {
      payment_amount += txn.amount;
      payment_count += 1;
    } else if (txn.txn_type === 'PURCHASE') {
      purchase_amount += txn.amount;
      purchase_count += 1;
    }
  }

  const total_amount = payment_amount + purchase_amount;
  let this_month_amount = 0;
  let this_month_transactions = 0;

  if (!startDate && !endDate) {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTxns = allTransactions.filter(txn => new Date(txn.txn_date) >= firstDayOfMonth);
    this_month_transactions = monthTxns.length;
    this_month_amount = monthTxns.reduce((sum, txn) =>
      txn.txn_type === 'PURCHASE' || txn.txn_type === 'PAYMENT' ? sum + txn.amount : sum, 0);
  } else {
    this_month_amount = total_amount;
    this_month_transactions = total_transactions;
  }

  const providerMap = new Map<string, number>();
  const merchantMap = new Map<string, { count: number; amount: number }>();

  for (const txn of allTransactions) {
    providerMap.set(txn.provider, (providerMap.get(txn.provider) ?? 0) + 1);
    const name = txn.merchant_name ?? 'Unknown';
    const entry = merchantMap.get(name) ?? { count: 0, amount: 0 };
    entry.count += 1;
    if (txn.txn_type === 'PURCHASE' || txn.txn_type === 'PAYMENT') entry.amount += txn.amount;
    merchantMap.set(name, entry);
  }

  let top_merchant: string | null = null;
  let top_merchant_amount = 0;
  let maxCount = 0;
  for (const [name, stats] of merchantMap) {
    if (stats.count > maxCount) {
      maxCount = stats.count;
      top_merchant = name;
      top_merchant_amount = stats.amount;
    }
  }

  const providers = Array.from(providerMap.entries()).map(([provider, count]) => ({ provider, count }));

  return {
    total_transactions, total_amount,
    payment_amount, payment_count,
    purchase_amount, purchase_count,
    this_month_amount, this_month_transactions,
    top_merchant, top_merchant_amount,
    providers, transactions: allTransactions,
  };
}

// ─── Monthly Control ──────────────────────────────────────────────────────────

export const fetchMonthlyIncomes = (year: number, month: number) =>
  _fetchMonthlyIncomes(supabase, year, month);

export const fetchMonthlyIncomesInRange = (startDate?: string, endDate?: string) =>
  _fetchMonthlyIncomesInRange(supabase, startDate, endDate);

export const createMonthlyIncome = (income: Omit<import('@personal-dashboard/supabase-queries').MonthlyIncome, 'id'>) =>
  _createMonthlyIncome(supabase, income);

export const updateMonthlyIncome = (
  id: number,
  updates: Partial<import('@personal-dashboard/supabase-queries').MonthlyIncome>,
) => _updateMonthlyIncome(supabase, id, updates);

export const deleteMonthlyIncome = (id: number) => _deleteMonthlyIncome(supabase, id);

export const fetchManualTransactions = (year: number, month: number, isPaid?: boolean) =>
  _fetchManualTransactions(supabase, year, month, isPaid);

export const createManualTransaction = (
  transaction: Omit<import('@personal-dashboard/supabase-queries').ManualTransaction, 'id'>,
) => _createManualTransaction(supabase, transaction);

export const updateManualTransaction = (
  id: number,
  updates: Partial<import('@personal-dashboard/supabase-queries').ManualTransaction>,
) => _updateManualTransaction(supabase, id, updates);

export const deleteManualTransaction = (id: number) => _deleteManualTransaction(supabase, id);

export const toggleManualTransactionPaidStatus = (id: number, isPaid: boolean) =>
  _toggleManualTransactionPaid(supabase, id, isPaid);

// ─── Push Notifications ───────────────────────────────────────────────────────

export const createPushSubscription = (data: {
  userEmail: string;
  endpoint: string;
  keys: string;
  userAgent?: string;
}) => _createPushSubscription(supabase, data);

export const deactivatePushSubscription = (data: { id: number }) =>
  _deactivateSubscription(supabase, data.id);

export async function getActivePushSubscriptions(data: { userEmail: string }): Promise<any> {
  const subs = await _getActivePushSubscriptionsByEmail(supabase, data.userEmail);
  return { data: { pushSubscriptions: subs } };
}

export async function getMaxPushSubscriptionId(): Promise<any> {
  const id = await _getMaxPushSubscriptionId(supabase);
  return { data: { pushSubscriptions: id != null ? [{ id }] : [] } };
}
