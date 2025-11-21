import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const ChannelType = {
  CARD: "CARD",
  BANK_TRANSFER: "BANK_TRANSFER",
  CASH: "CASH",
  MOBILE_PAYMENT: "MOBILE_PAYMENT",
  OTHER: "OTHER",
}

export const TxnType = {
  PURCHASE: "PURCHASE",
  PAYMENT: "PAYMENT",
  REFUND: "REFUND",
  WITHDRAWAL: "WITHDRAWAL",
  TRANSFER: "TRANSFER",
  FEE: "FEE",
  OTHER: "OTHER",
}

export const connectorConfig = {
  connector: 'default',
  service: 'personal-dashboard',
  location: 'us-central1'
};

export const createEmailRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateEmail', inputVars);
}
createEmailRef.operationName = 'CreateEmail';

export function createEmail(dcOrVars, vars) {
  return executeMutation(createEmailRef(dcOrVars, vars));
}

export const updateEmailParsedRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateEmailParsed', inputVars);
}
updateEmailParsedRef.operationName = 'UpdateEmailParsed';

export function updateEmailParsed(dcOrVars, vars) {
  return executeMutation(updateEmailParsedRef(dcOrVars, vars));
}

export const createMerchantRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateMerchant', inputVars);
}
createMerchantRef.operationName = 'CreateMerchant';

export function createMerchant(dcOrVars, vars) {
  return executeMutation(createMerchantRef(dcOrVars, vars));
}

export const createTransactionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateTransaction', inputVars);
}
createTransactionRef.operationName = 'CreateTransaction';

export function createTransaction(dcOrVars, vars) {
  return executeMutation(createTransactionRef(dcOrVars, vars));
}

export const updateTransactionMerchantRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateTransactionMerchant', inputVars);
}
updateTransactionMerchantRef.operationName = 'UpdateTransactionMerchant';

export function updateTransactionMerchant(dcOrVars, vars) {
  return executeMutation(updateTransactionMerchantRef(dcOrVars, vars));
}

export const updateTransactionNotesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateTransactionNotes', inputVars);
}
updateTransactionNotesRef.operationName = 'UpdateTransactionNotes';

export function updateTransactionNotes(dcOrVars, vars) {
  return executeMutation(updateTransactionNotesRef(dcOrVars, vars));
}

export const deleteTransactionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteTransaction', inputVars);
}
deleteTransactionRef.operationName = 'DeleteTransaction';

export function deleteTransaction(dcOrVars, vars) {
  return executeMutation(deleteTransactionRef(dcOrVars, vars));
}

export const deleteEmailRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteEmail', inputVars);
}
deleteEmailRef.operationName = 'DeleteEmail';

export function deleteEmail(dcOrVars, vars) {
  return executeMutation(deleteEmailRef(dcOrVars, vars));
}

export const updateGmailSyncStateRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateGmailSyncState', inputVars);
}
updateGmailSyncStateRef.operationName = 'UpdateGmailSyncState';

export function updateGmailSyncState(dcOrVars, vars) {
  return executeMutation(updateGmailSyncStateRef(dcOrVars, vars));
}

export const deleteMerchantRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteMerchant', inputVars);
}
deleteMerchantRef.operationName = 'DeleteMerchant';

export function deleteMerchant(dcOrVars, vars) {
  return executeMutation(deleteMerchantRef(dcOrVars, vars));
}

export const createCategoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateCategory', inputVars);
}
createCategoryRef.operationName = 'CreateCategory';

export function createCategory(dcOrVars, vars) {
  return executeMutation(createCategoryRef(dcOrVars, vars));
}

export const updateCategoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateCategory', inputVars);
}
updateCategoryRef.operationName = 'UpdateCategory';

export function updateCategory(dcOrVars, vars) {
  return executeMutation(updateCategoryRef(dcOrVars, vars));
}

export const deleteCategoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteCategory', inputVars);
}
deleteCategoryRef.operationName = 'DeleteCategory';

export function deleteCategory(dcOrVars, vars) {
  return executeMutation(deleteCategoryRef(dcOrVars, vars));
}

export const updateMerchantCategoryIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateMerchantCategoryId', inputVars);
}
updateMerchantCategoryIdRef.operationName = 'UpdateMerchantCategoryId';

export function updateMerchantCategoryId(dcOrVars, vars) {
  return executeMutation(updateMerchantCategoryIdRef(dcOrVars, vars));
}

export const updateMerchantNormalizedNameRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateMerchantNormalizedName', inputVars);
}
updateMerchantNormalizedNameRef.operationName = 'UpdateMerchantNormalizedName';

export function updateMerchantNormalizedName(dcOrVars, vars) {
  return executeMutation(updateMerchantNormalizedNameRef(dcOrVars, vars));
}

export const listTransactionsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListTransactions', inputVars);
}
listTransactionsRef.operationName = 'ListTransactions';

export function listTransactions(dcOrVars, vars) {
  return executeQuery(listTransactionsRef(dcOrVars, vars));
}

export const getTransactionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTransaction', inputVars);
}
getTransactionRef.operationName = 'GetTransaction';

export function getTransaction(dcOrVars, vars) {
  return executeQuery(getTransactionRef(dcOrVars, vars));
}

export const listMerchantsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMerchants', inputVars);
}
listMerchantsRef.operationName = 'ListMerchants';

export function listMerchants(dcOrVars, vars) {
  return executeQuery(listMerchantsRef(dcOrVars, vars));
}

export const getMerchantsCountRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMerchantsCount', inputVars);
}
getMerchantsCountRef.operationName = 'GetMerchantsCount';

export function getMerchantsCount(dcOrVars, vars) {
  return executeQuery(getMerchantsCountRef(dcOrVars, vars));
}

export const getMerchantRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMerchant', inputVars);
}
getMerchantRef.operationName = 'GetMerchant';

export function getMerchant(dcOrVars, vars) {
  return executeQuery(getMerchantRef(dcOrVars, vars));
}

export const getMerchantByNameRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMerchantByName', inputVars);
}
getMerchantByNameRef.operationName = 'GetMerchantByName';

export function getMerchantByName(dcOrVars, vars) {
  return executeQuery(getMerchantByNameRef(dcOrVars, vars));
}

export const getSpendingSummaryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetSpendingSummary', inputVars);
}
getSpendingSummaryRef.operationName = 'GetSpendingSummary';

export function getSpendingSummary(dcOrVars, vars) {
  return executeQuery(getSpendingSummaryRef(dcOrVars, vars));
}

export const getTopMerchantsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTopMerchants', inputVars);
}
getTopMerchantsRef.operationName = 'GetTopMerchants';

export function getTopMerchants(dcOrVars, vars) {
  return executeQuery(getTopMerchantsRef(dcOrVars, vars));
}

export const getSpendingByCategoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetSpendingByCategory', inputVars);
}
getSpendingByCategoryRef.operationName = 'GetSpendingByCategory';

export function getSpendingByCategory(dcOrVars, vars) {
  return executeQuery(getSpendingByCategoryRef(dcOrVars, vars));
}

export const listEmailsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListEmails', inputVars);
}
listEmailsRef.operationName = 'ListEmails';

export function listEmails(dcOrVars, vars) {
  return executeQuery(listEmailsRef(dcOrVars, vars));
}

export const getEmailRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetEmail', inputVars);
}
getEmailRef.operationName = 'GetEmail';

export function getEmail(dcOrVars, vars) {
  return executeQuery(getEmailRef(dcOrVars, vars));
}

export const searchTransactionsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'SearchTransactions', inputVars);
}
searchTransactionsRef.operationName = 'SearchTransactions';

export function searchTransactions(dcOrVars, vars) {
  return executeQuery(searchTransactionsRef(dcOrVars, vars));
}

export const getDailySpendingRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetDailySpending', inputVars);
}
getDailySpendingRef.operationName = 'GetDailySpending';

export function getDailySpending(dcOrVars, vars) {
  return executeQuery(getDailySpendingRef(dcOrVars, vars));
}

export const getGmailSyncStateRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetGmailSyncState');
}
getGmailSyncStateRef.operationName = 'GetGmailSyncState';

export function getGmailSyncState(dc) {
  return executeQuery(getGmailSyncStateRef(dc));
}

export const getTransactionsByMerchantRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTransactionsByMerchant', inputVars);
}
getTransactionsByMerchantRef.operationName = 'GetTransactionsByMerchant';

export function getTransactionsByMerchant(dcOrVars, vars) {
  return executeQuery(getTransactionsByMerchantRef(dcOrVars, vars));
}

export const listCategoriesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCategories');
}
listCategoriesRef.operationName = 'ListCategories';

export function listCategories(dc) {
  return executeQuery(listCategoriesRef(dc));
}

export const getCategoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetCategory', inputVars);
}
getCategoryRef.operationName = 'GetCategory';

export function getCategory(dcOrVars, vars) {
  return executeQuery(getCategoryRef(dcOrVars, vars));
}

export const getCategoryByNameRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetCategoryByName', inputVars);
}
getCategoryByNameRef.operationName = 'GetCategoryByName';

export function getCategoryByName(dcOrVars, vars) {
  return executeQuery(getCategoryByNameRef(dcOrVars, vars));
}

export const getRecentEmailsForMonitoringRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetRecentEmailsForMonitoring', inputVars);
}
getRecentEmailsForMonitoringRef.operationName = 'GetRecentEmailsForMonitoring';

export function getRecentEmailsForMonitoring(dcOrVars, vars) {
  return executeQuery(getRecentEmailsForMonitoringRef(dcOrVars, vars));
}

export const getRecentTransactionsForMonitoringRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetRecentTransactionsForMonitoring', inputVars);
}
getRecentTransactionsForMonitoringRef.operationName = 'GetRecentTransactionsForMonitoring';

export function getRecentTransactionsForMonitoring(dcOrVars, vars) {
  return executeQuery(getRecentTransactionsForMonitoringRef(dcOrVars, vars));
}

export const getAllEmailsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAllEmails');
}
getAllEmailsRef.operationName = 'GetAllEmails';

export function getAllEmails(dc) {
  return executeQuery(getAllEmailsRef(dc));
}

export const getEmailsAfterDateRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetEmailsAfterDate', inputVars);
}
getEmailsAfterDateRef.operationName = 'GetEmailsAfterDate';

export function getEmailsAfterDate(dcOrVars, vars) {
  return executeQuery(getEmailsAfterDateRef(dcOrVars, vars));
}

export const getLatestEmailRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetLatestEmail');
}
getLatestEmailRef.operationName = 'GetLatestEmail';

export function getLatestEmail(dc) {
  return executeQuery(getLatestEmailRef(dc));
}

export const getAllTransactionsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAllTransactions');
}
getAllTransactionsRef.operationName = 'GetAllTransactions';

export function getAllTransactions(dc) {
  return executeQuery(getAllTransactionsRef(dc));
}

export const getTransactionsAfterDateRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTransactionsAfterDate', inputVars);
}
getTransactionsAfterDateRef.operationName = 'GetTransactionsAfterDate';

export function getTransactionsAfterDate(dcOrVars, vars) {
  return executeQuery(getTransactionsAfterDateRef(dcOrVars, vars));
}

export const getLatestTransactionRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetLatestTransaction');
}
getLatestTransactionRef.operationName = 'GetLatestTransaction';

export function getLatestTransaction(dc) {
  return executeQuery(getLatestTransactionRef(dc));
}

