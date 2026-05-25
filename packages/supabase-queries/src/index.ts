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
} from './types.js';

export {
  mapTransactionRow,
  fetchTransactions,
  fetchTransactionsPaginated,
  fetchTransactionSummary,
  fetchTransactionFilterOptions,
  exportTransactionsCSV,
} from './transactions.js';

export {
  fetchMerchants,
  fetchMerchantsPaginated,
  updateMerchantCategory,
} from './merchants.js';

export {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from './categories.js';

export { getLastProcessedEmail } from './emails.js';

export {
  getPendingPaymentsNextDays,
  getActiveSubscriptions,
  deactivateSubscription,
  createPushSubscription,
  getActivePushSubscriptionsByEmail,
  getMaxPushSubscriptionId,
} from './notifications.js';

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
