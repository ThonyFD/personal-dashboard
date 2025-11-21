const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const ChannelType = {
  CARD: "CARD",
  BANK_TRANSFER: "BANK_TRANSFER",
  CASH: "CASH",
  MOBILE_PAYMENT: "MOBILE_PAYMENT",
  OTHER: "OTHER",
}
exports.ChannelType = ChannelType;

const TxnType = {
  PURCHASE: "PURCHASE",
  PAYMENT: "PAYMENT",
  REFUND: "REFUND",
  WITHDRAWAL: "WITHDRAWAL",
  TRANSFER: "TRANSFER",
  FEE: "FEE",
  OTHER: "OTHER",
}
exports.TxnType = TxnType;

const connectorConfig = {
  connector: 'default',
  service: 'personal-dashboard',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

const listTransactionsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListTransactions', inputVars);
}
listTransactionsRef.operationName = 'ListTransactions';
exports.listTransactionsRef = listTransactionsRef;

exports.listTransactions = function listTransactions(dcOrVars, vars) {
  return executeQuery(listTransactionsRef(dcOrVars, vars));
};

const getTransactionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTransaction', inputVars);
}
getTransactionRef.operationName = 'GetTransaction';
exports.getTransactionRef = getTransactionRef;

exports.getTransaction = function getTransaction(dcOrVars, vars) {
  return executeQuery(getTransactionRef(dcOrVars, vars));
};

const listMerchantsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMerchants', inputVars);
}
listMerchantsRef.operationName = 'ListMerchants';
exports.listMerchantsRef = listMerchantsRef;

exports.listMerchants = function listMerchants(dcOrVars, vars) {
  return executeQuery(listMerchantsRef(dcOrVars, vars));
};

const getMerchantsCountRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMerchantsCount', inputVars);
}
getMerchantsCountRef.operationName = 'GetMerchantsCount';
exports.getMerchantsCountRef = getMerchantsCountRef;

exports.getMerchantsCount = function getMerchantsCount(dcOrVars, vars) {
  return executeQuery(getMerchantsCountRef(dcOrVars, vars));
};

const getMerchantRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMerchant', inputVars);
}
getMerchantRef.operationName = 'GetMerchant';
exports.getMerchantRef = getMerchantRef;

exports.getMerchant = function getMerchant(dcOrVars, vars) {
  return executeQuery(getMerchantRef(dcOrVars, vars));
};

const getMerchantByNameRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMerchantByName', inputVars);
}
getMerchantByNameRef.operationName = 'GetMerchantByName';
exports.getMerchantByNameRef = getMerchantByNameRef;

exports.getMerchantByName = function getMerchantByName(dcOrVars, vars) {
  return executeQuery(getMerchantByNameRef(dcOrVars, vars));
};

const getSpendingSummaryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetSpendingSummary', inputVars);
}
getSpendingSummaryRef.operationName = 'GetSpendingSummary';
exports.getSpendingSummaryRef = getSpendingSummaryRef;

exports.getSpendingSummary = function getSpendingSummary(dcOrVars, vars) {
  return executeQuery(getSpendingSummaryRef(dcOrVars, vars));
};

const getTopMerchantsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTopMerchants', inputVars);
}
getTopMerchantsRef.operationName = 'GetTopMerchants';
exports.getTopMerchantsRef = getTopMerchantsRef;

exports.getTopMerchants = function getTopMerchants(dcOrVars, vars) {
  return executeQuery(getTopMerchantsRef(dcOrVars, vars));
};

const getSpendingByCategoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetSpendingByCategory', inputVars);
}
getSpendingByCategoryRef.operationName = 'GetSpendingByCategory';
exports.getSpendingByCategoryRef = getSpendingByCategoryRef;

exports.getSpendingByCategory = function getSpendingByCategory(dcOrVars, vars) {
  return executeQuery(getSpendingByCategoryRef(dcOrVars, vars));
};

const listEmailsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListEmails', inputVars);
}
listEmailsRef.operationName = 'ListEmails';
exports.listEmailsRef = listEmailsRef;

exports.listEmails = function listEmails(dcOrVars, vars) {
  return executeQuery(listEmailsRef(dcOrVars, vars));
};

const getEmailRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetEmail', inputVars);
}
getEmailRef.operationName = 'GetEmail';
exports.getEmailRef = getEmailRef;

exports.getEmail = function getEmail(dcOrVars, vars) {
  return executeQuery(getEmailRef(dcOrVars, vars));
};

const searchTransactionsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'SearchTransactions', inputVars);
}
searchTransactionsRef.operationName = 'SearchTransactions';
exports.searchTransactionsRef = searchTransactionsRef;

exports.searchTransactions = function searchTransactions(dcOrVars, vars) {
  return executeQuery(searchTransactionsRef(dcOrVars, vars));
};

const getDailySpendingRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetDailySpending', inputVars);
}
getDailySpendingRef.operationName = 'GetDailySpending';
exports.getDailySpendingRef = getDailySpendingRef;

exports.getDailySpending = function getDailySpending(dcOrVars, vars) {
  return executeQuery(getDailySpendingRef(dcOrVars, vars));
};

const getGmailSyncStateRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetGmailSyncState');
}
getGmailSyncStateRef.operationName = 'GetGmailSyncState';
exports.getGmailSyncStateRef = getGmailSyncStateRef;

exports.getGmailSyncState = function getGmailSyncState(dc) {
  return executeQuery(getGmailSyncStateRef(dc));
};

const getTransactionsByMerchantRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTransactionsByMerchant', inputVars);
}
getTransactionsByMerchantRef.operationName = 'GetTransactionsByMerchant';
exports.getTransactionsByMerchantRef = getTransactionsByMerchantRef;

exports.getTransactionsByMerchant = function getTransactionsByMerchant(dcOrVars, vars) {
  return executeQuery(getTransactionsByMerchantRef(dcOrVars, vars));
};

const listCategoriesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCategories');
}
listCategoriesRef.operationName = 'ListCategories';
exports.listCategoriesRef = listCategoriesRef;

exports.listCategories = function listCategories(dc) {
  return executeQuery(listCategoriesRef(dc));
};

const getCategoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetCategory', inputVars);
}
getCategoryRef.operationName = 'GetCategory';
exports.getCategoryRef = getCategoryRef;

exports.getCategory = function getCategory(dcOrVars, vars) {
  return executeQuery(getCategoryRef(dcOrVars, vars));
};

const getCategoryByNameRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetCategoryByName', inputVars);
}
getCategoryByNameRef.operationName = 'GetCategoryByName';
exports.getCategoryByNameRef = getCategoryByNameRef;

exports.getCategoryByName = function getCategoryByName(dcOrVars, vars) {
  return executeQuery(getCategoryByNameRef(dcOrVars, vars));
};

const createEmailRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateEmail', inputVars);
}
createEmailRef.operationName = 'CreateEmail';
exports.createEmailRef = createEmailRef;

exports.createEmail = function createEmail(dcOrVars, vars) {
  return executeMutation(createEmailRef(dcOrVars, vars));
};

const updateEmailParsedRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateEmailParsed', inputVars);
}
updateEmailParsedRef.operationName = 'UpdateEmailParsed';
exports.updateEmailParsedRef = updateEmailParsedRef;

exports.updateEmailParsed = function updateEmailParsed(dcOrVars, vars) {
  return executeMutation(updateEmailParsedRef(dcOrVars, vars));
};

const createMerchantRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateMerchant', inputVars);
}
createMerchantRef.operationName = 'CreateMerchant';
exports.createMerchantRef = createMerchantRef;

exports.createMerchant = function createMerchant(dcOrVars, vars) {
  return executeMutation(createMerchantRef(dcOrVars, vars));
};

const updateMerchantCategoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateMerchantCategory', inputVars);
}
updateMerchantCategoryRef.operationName = 'UpdateMerchantCategory';
exports.updateMerchantCategoryRef = updateMerchantCategoryRef;

exports.updateMerchantCategory = function updateMerchantCategory(dcOrVars, vars) {
  return executeMutation(updateMerchantCategoryRef(dcOrVars, vars));
};

const createTransactionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateTransaction', inputVars);
}
createTransactionRef.operationName = 'CreateTransaction';
exports.createTransactionRef = createTransactionRef;

exports.createTransaction = function createTransaction(dcOrVars, vars) {
  return executeMutation(createTransactionRef(dcOrVars, vars));
};

const updateTransactionMerchantRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateTransactionMerchant', inputVars);
}
updateTransactionMerchantRef.operationName = 'UpdateTransactionMerchant';
exports.updateTransactionMerchantRef = updateTransactionMerchantRef;

exports.updateTransactionMerchant = function updateTransactionMerchant(dcOrVars, vars) {
  return executeMutation(updateTransactionMerchantRef(dcOrVars, vars));
};

const updateTransactionNotesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateTransactionNotes', inputVars);
}
updateTransactionNotesRef.operationName = 'UpdateTransactionNotes';
exports.updateTransactionNotesRef = updateTransactionNotesRef;

exports.updateTransactionNotes = function updateTransactionNotes(dcOrVars, vars) {
  return executeMutation(updateTransactionNotesRef(dcOrVars, vars));
};

const deleteTransactionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteTransaction', inputVars);
}
deleteTransactionRef.operationName = 'DeleteTransaction';
exports.deleteTransactionRef = deleteTransactionRef;

exports.deleteTransaction = function deleteTransaction(dcOrVars, vars) {
  return executeMutation(deleteTransactionRef(dcOrVars, vars));
};

const deleteEmailRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteEmail', inputVars);
}
deleteEmailRef.operationName = 'DeleteEmail';
exports.deleteEmailRef = deleteEmailRef;

exports.deleteEmail = function deleteEmail(dcOrVars, vars) {
  return executeMutation(deleteEmailRef(dcOrVars, vars));
};

const updateGmailSyncStateRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateGmailSyncState', inputVars);
}
updateGmailSyncStateRef.operationName = 'UpdateGmailSyncState';
exports.updateGmailSyncStateRef = updateGmailSyncStateRef;

exports.updateGmailSyncState = function updateGmailSyncState(dcOrVars, vars) {
  return executeMutation(updateGmailSyncStateRef(dcOrVars, vars));
};

const deleteMerchantRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteMerchant', inputVars);
}
deleteMerchantRef.operationName = 'DeleteMerchant';
exports.deleteMerchantRef = deleteMerchantRef;

exports.deleteMerchant = function deleteMerchant(dcOrVars, vars) {
  return executeMutation(deleteMerchantRef(dcOrVars, vars));
};

const createCategoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateCategory', inputVars);
}
createCategoryRef.operationName = 'CreateCategory';
exports.createCategoryRef = createCategoryRef;

exports.createCategory = function createCategory(dcOrVars, vars) {
  return executeMutation(createCategoryRef(dcOrVars, vars));
};

const updateCategoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateCategory', inputVars);
}
updateCategoryRef.operationName = 'UpdateCategory';
exports.updateCategoryRef = updateCategoryRef;

exports.updateCategory = function updateCategory(dcOrVars, vars) {
  return executeMutation(updateCategoryRef(dcOrVars, vars));
};

const deleteCategoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteCategory', inputVars);
}
deleteCategoryRef.operationName = 'DeleteCategory';
exports.deleteCategoryRef = deleteCategoryRef;

exports.deleteCategory = function deleteCategory(dcOrVars, vars) {
  return executeMutation(deleteCategoryRef(dcOrVars, vars));
};

const updateMerchantCategoryIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateMerchantCategoryId', inputVars);
}
updateMerchantCategoryIdRef.operationName = 'UpdateMerchantCategoryId';
exports.updateMerchantCategoryIdRef = updateMerchantCategoryIdRef;

exports.updateMerchantCategoryId = function updateMerchantCategoryId(dcOrVars, vars) {
  return executeMutation(updateMerchantCategoryIdRef(dcOrVars, vars));
};
