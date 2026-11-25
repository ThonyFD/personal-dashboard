export type {
  Transaction,
  TransactionFilters,
  PaginatedTransactionsResult,
  TransactionSummary,
  Merchant,
  Category,
  CategoryRef,
  MonthlyIncome,
  ManualTransaction,
  PendingPayment,
  PushSubscription,
  DayBlock,
  FrequencyType,
  HabitStatus,
  HabitTemplate,
  UserHabit,
  HabitLog,
  MoodTag,
  MoodLog,
  HabitDayCompletion,
} from './types.js';

export {
  mapTransactionRow,
  fetchTransactions,
  fetchTransactionsPaginated,
  fetchTransactionSummary,
  fetchTransactionDetail,
  fetchTransactionFilterOptions,
  exportTransactionsCSV,
  computeTopMerchant,
  computeBusiestMerchant,
  DEBIT_TYPES,
} from './transactions.js';

export {
  fetchMerchants,
  fetchMerchantsPaginated,
  updateMerchantCategory,
  markMerchantOwnAccount,
} from './merchants.js';

export {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from './categories.js';

export { getLastProcessedEmail, fetchParsedGmailMessageIds } from './emails.js';

export {
  getPendingPaymentsNextDays,
  getActiveSubscriptions,
  deactivateSubscription,
  createPushSubscription,
  getActivePushSubscriptionsByEmail,
  getMaxPushSubscriptionId,
} from './notifications.js';

export type { SystemAlert } from './alerts.js';
export { fetchUnresolvedAlerts, resolveAlert } from './alerts.js';

export {
  fetchMonthlyIncomes,
  fetchMonthlyIncomesInRange,
  createMonthlyIncome,
  updateMonthlyIncome,
  deleteMonthlyIncome,
  fetchManualTransactions,
  createManualTransaction,
  updateManualTransaction,
  deleteManualTransaction,
  toggleManualTransactionPaid,
} from './monthly.js';

export {
  ALL_DAYS_MASK,
  WEEKDAYS_MASK,
  computeStreak,
  createUserHabit,
  deleteHabitLog,
  deleteUserHabit,
  fetchDailyCompletion,
  fetchHabitLogsByDate,
  fetchHabitLogsInRange,
  getHabitCompletionSummary,
  fetchHabitTemplates,
  fetchUserHabits,
  getHabitCompletionLog,
  isHabitDueOnDate,
  isHabitCompletedOnDate,
  pendingFirst,
  updateUserHabit,
  upsertHabitLog,
} from './habits.js';

export {
  deleteMoodLog,
  fetchMoodLogByDate,
  fetchMoodLogsInRange,
  fetchMoodTags,
  upsertMoodLog,
} from './mood.js';

export { fetchIsOwner } from './account.js';

export type {
  AlertSettings,
  AlertTransaction,
  BudgetStatus,
  BudgetAlertRule,
  BudgetAlertMessage,
  BudgetAlertResult,
  EligibilityResult,
} from './budget-alerts.js';
export {
  ALERTABLE_TXN_TYPES,
  PANAMA_TIME_ZONE,
  alertAsOfDate,
  alertWindowDates,
  budgetAlertEligibility,
  buildBudgetAlert,
  formatUsd,
  panamaDate,
} from './budget-alerts.js';

export type { Budget, AlertTransactionRow } from './budgets.js';
export {
  claimBudgetAlert,
  createBudget,
  deleteBudget,
  fetchBudgetAlertCandidates,
  fetchAlertSettings,
  fetchAlertTransaction,
  fetchBudgets,
  fetchBudgetStatus,
  hasBudgetAlert,
  mapAlertSettings,
  mapBudgetStatusRow,
  updateAlertSettings,
  updateBudget,
} from './budgets.js';
