import { supabase } from '../lib/supabase';
import {
  ALL_DAYS_MASK,
  WEEKDAYS_MASK,
  fetchTransactions as _fetchTransactions,
  fetchTransactionsPaginated as _fetchTransactionsPaginated,
  fetchTransactionSummary as _fetchTransactionSummary,
  fetchTransactionDetail as _fetchTransactionDetail,
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
  fetchUnresolvedAlerts as _fetchUnresolvedAlerts,
  resolveAlert as _resolveAlert,
  fetchHabitTemplates as _fetchHabitTemplates,
  fetchUserHabits as _fetchUserHabits,
  createUserHabit as _createUserHabit,
  updateUserHabit as _updateUserHabit,
  deleteUserHabit as _deleteUserHabit,
  fetchHabitLogsByDate as _fetchHabitLogsByDate,
  fetchHabitLogsInRange as _fetchHabitLogsInRange,
  upsertHabitLog as _upsertHabitLog,
  deleteHabitLog as _deleteHabitLog,
  fetchDailyCompletion as _fetchDailyCompletion,
  fetchMoodTags as _fetchMoodTags,
  fetchMoodLogByDate as _fetchMoodLogByDate,
  fetchMoodLogsInRange as _fetchMoodLogsInRange,
  upsertMoodLog as _upsertMoodLog,
  deleteMoodLog as _deleteMoodLog,
  computeTopMerchant,
  computeBusiestMerchant,
  computeStreak,
  DEBIT_TYPES,
  getHabitCompletionSummary,
  getHabitCompletionLog,
  isHabitDueOnDate,
  isHabitCompletedOnDate,
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
  DayBlock,
  FrequencyType,
  HabitStatus,
  HabitTemplate,
  UserHabit,
  HabitLog,
  MoodTag,
  MoodLog,
  HabitDayCompletion,
} from '@personal-dashboard/supabase-queries';

// ─── Stats (web-only aggregation, not shared) ─────────────────────────────────

export interface Stats {
  total_transactions: number;
  total_amount: number;
  payment_amount: number;
  payment_count: number;
  purchase_amount: number;
  purchase_count: number;
  total_spent_amount: number;
  total_spent_count: number;
  this_month_amount: number;
  this_month_transactions: number;
  top_merchant: string | null;
  top_merchant_amount: number;
  busiest_merchant: string | null;
  busiest_merchant_count: number;
  busiest_merchant_amount: number;
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

export const fetchTransactionDetail = (id: number) =>
  _fetchTransactionDetail(supabase, id);

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
  let total_spent_amount = 0, total_spent_count = 0;

  for (const txn of allTransactions) {
    if (txn.txn_type === 'PAYMENT') {
      payment_amount += txn.amount;
      payment_count += 1;
    } else if (txn.txn_type === 'PURCHASE') {
      purchase_amount += txn.amount;
      purchase_count += 1;
    }
    if (DEBIT_TYPES.has(txn.txn_type)) {
      total_spent_amount += txn.amount;
      total_spent_count += 1;
    }
  }

  const total_amount = total_spent_amount;
  let this_month_amount = 0;
  let this_month_transactions = 0;

  if (!startDate && !endDate) {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTxns = allTransactions.filter(txn => new Date(txn.txn_date) >= firstDayOfMonth);
    this_month_transactions = monthTxns.length;
    this_month_amount = monthTxns.reduce((sum, txn) =>
      DEBIT_TYPES.has(txn.txn_type) ? sum + txn.amount : sum, 0);
  } else {
    this_month_amount = total_amount;
    this_month_transactions = total_transactions;
  }

  const providerMap = new Map<string, number>();
  for (const txn of allTransactions) {
    providerMap.set(txn.provider, (providerMap.get(txn.provider) ?? 0) + 1);
  }

  const { topMerchant: top_merchant, topMerchantAmount: top_merchant_amount } =
    computeTopMerchant(allTransactions);

  const {
    busiestMerchant: busiest_merchant,
    busiestMerchantCount: busiest_merchant_count,
    busiestMerchantAmount: busiest_merchant_amount,
  } = computeBusiestMerchant(allTransactions);

  const providers = Array.from(providerMap.entries()).map(([provider, count]) => ({ provider, count }));

  return {
    total_transactions, total_amount,
    payment_amount, payment_count,
    purchase_amount, purchase_count,
    total_spent_amount, total_spent_count,
    this_month_amount, this_month_transactions,
    top_merchant, top_merchant_amount,
    busiest_merchant, busiest_merchant_count, busiest_merchant_amount,
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

// ─── System Alerts ────────────────────────────────────────────────────────────

export type { SystemAlert } from '@personal-dashboard/supabase-queries';

export const fetchUnresolvedAlerts = () => _fetchUnresolvedAlerts(supabase);
export const resolveAlert = (id: number) => _resolveAlert(supabase, id);

// ─── Azton Habits & Mood ─────────────────────────────────────────────────────

export {
  ALL_DAYS_MASK,
  WEEKDAYS_MASK,
  computeStreak,
  getHabitCompletionSummary,
  getHabitCompletionLog,
  isHabitDueOnDate,
  isHabitCompletedOnDate,
};

export const fetchHabitTemplates = () => _fetchHabitTemplates(supabase);

export const fetchUserHabits = (opts?: { activeOnly?: boolean }) =>
  _fetchUserHabits(supabase, opts);

export const createUserHabit = (
  habit: Omit<import('@personal-dashboard/supabase-queries').UserHabit, 'id'>,
) => _createUserHabit(supabase, habit);

export const updateUserHabit = (
  id: number,
  updates: Partial<import('@personal-dashboard/supabase-queries').UserHabit>,
) => _updateUserHabit(supabase, id, updates);

export const deleteUserHabit = (id: number) => _deleteUserHabit(supabase, id);

export const fetchHabitLogsByDate = (logDate: string) =>
  _fetchHabitLogsByDate(supabase, logDate);

export const fetchHabitLogsInRange = (startDate: string, endDate: string) =>
  _fetchHabitLogsInRange(supabase, startDate, endDate);

export const upsertHabitLog = (params: {
  userHabitId: number;
  logDate: string;
  status: import('@personal-dashboard/supabase-queries').HabitStatus;
  actualDurationMinutes?: number;
}) => _upsertHabitLog(supabase, params);

export const deleteHabitLog = (userHabitId: number, logDate: string) =>
  _deleteHabitLog(supabase, userHabitId, logDate);

export const fetchDailyCompletion = (startDate: string, endDate: string) =>
  _fetchDailyCompletion(supabase, startDate, endDate);

export const fetchMoodTags = () => _fetchMoodTags(supabase);

export const fetchMoodLogByDate = (logDate: string) =>
  _fetchMoodLogByDate(supabase, logDate);

export const fetchMoodLogsInRange = (startDate: string, endDate: string) =>
  _fetchMoodLogsInRange(supabase, startDate, endDate);

export const upsertMoodLog = (params: {
  logDate: string;
  moodScore: number;
  journalText?: string | null;
  tagIds: number[];
}) => _upsertMoodLog(supabase, params);

export const deleteMoodLog = (id: number) => _deleteMoodLog(supabase, id);
