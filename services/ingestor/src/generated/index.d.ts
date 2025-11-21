import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export enum ChannelType {
  CARD = "CARD",
  BANK_TRANSFER = "BANK_TRANSFER",
  CASH = "CASH",
  MOBILE_PAYMENT = "MOBILE_PAYMENT",
  OTHER = "OTHER",
};

export enum TxnType {
  PURCHASE = "PURCHASE",
  PAYMENT = "PAYMENT",
  REFUND = "REFUND",
  WITHDRAWAL = "WITHDRAWAL",
  TRANSFER = "TRANSFER",
  FEE = "FEE",
  OTHER = "OTHER",
};



export interface Category_Key {
  id: number;
  __typename?: 'Category_Key';
}

export interface CreateCategoryData {
  category_insert: Category_Key;
}

export interface CreateCategoryVariables {
  id: number;
  name: string;
  icon: string;
  color: string;
  description?: string | null;
  isDefault?: boolean | null;
}

export interface CreateEmailData {
  email_insert: Email_Key;
}

export interface CreateEmailVariables {
  id: number;
  gmailMessageId: string;
  gmailHistoryId?: number | null;
  senderEmail: string;
  senderName?: string | null;
  subject?: string | null;
  receivedAt: TimestampString;
  bodyHash: string;
  labels?: string[] | null;
  provider?: string | null;
  parsed?: boolean | null;
}

export interface CreateMerchantData {
  merchant_insert: Merchant_Key;
}

export interface CreateMerchantVariables {
  id: number;
  name: string;
  normalizedName: string;
  categoryId?: number | null;
}

export interface CreateTransactionData {
  transaction_insert: Transaction_Key;
}

export interface CreateTransactionVariables {
  id: number;
  emailId: number;
  merchantId?: number | null;
  txnType: TxnType;
  channel: ChannelType;
  amount: number;
  currency?: string | null;
  merchantName?: string | null;
  merchantRaw?: string | null;
  txnDate: DateString;
  txnTimestamp?: TimestampString | null;
  cardLast4?: string | null;
  accountLast4?: string | null;
  provider: string;
  referenceNumber?: string | null;
  description?: string | null;
  notes?: string | null;
  idempotencyKey: string;
}

export interface DeleteCategoryData {
  category_delete?: Category_Key | null;
}

export interface DeleteCategoryVariables {
  id: number;
}

export interface DeleteEmailData {
  email_delete?: Email_Key | null;
}

export interface DeleteEmailVariables {
  id: number;
}

export interface DeleteMerchantData {
  merchant_delete?: Merchant_Key | null;
}

export interface DeleteMerchantVariables {
  id: number;
}

export interface DeleteTransactionData {
  transaction_delete?: Transaction_Key | null;
}

export interface DeleteTransactionVariables {
  id: number;
}

export interface Email_Key {
  id: number;
  __typename?: 'Email_Key';
}

export interface GetAllEmailsData {
  emails: ({
    id: number;
    receivedAt: TimestampString;
  } & Email_Key)[];
}

export interface GetAllTransactionsData {
  transactions: ({
    id: number;
    txnDate: DateString;
  } & Transaction_Key)[];
}

export interface GetCategoryByNameData {
  categories: ({
    id: number;
    name: string;
    icon: string;
    color: string;
    description?: string | null;
    isDefault?: boolean | null;
  } & Category_Key)[];
}

export interface GetCategoryByNameVariables {
  name: string;
}

export interface GetCategoryData {
  category?: {
    id: number;
    name: string;
    icon: string;
    color: string;
    description?: string | null;
    isDefault?: boolean | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Category_Key;
}

export interface GetCategoryVariables {
  id: number;
}

export interface GetDailySpendingData {
  transactions: ({
    txnDate: DateString;
    amount: number;
    txnType: TxnType;
  })[];
}

export interface GetDailySpendingVariables {
  startDate: DateString;
  endDate: DateString;
}

export interface GetEmailData {
  email?: {
    id: number;
    gmailMessageId: string;
    gmailHistoryId?: number | null;
    senderEmail: string;
    senderName?: string | null;
    subject?: string | null;
    receivedAt: TimestampString;
    bodyHash: string;
    labels?: string[] | null;
    provider?: string | null;
    parsed?: boolean | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Email_Key;
}

export interface GetEmailVariables {
  id: number;
}

export interface GetEmailsAfterDateData {
  emails: ({
    id: number;
    receivedAt: TimestampString;
  } & Email_Key)[];
}

export interface GetEmailsAfterDateVariables {
  minDate: TimestampString;
}

export interface GetGmailSyncStateData {
  gmailSyncState?: {
    id: number;
    lastHistoryId: number;
    lastSyncedAt: TimestampString;
    watchExpiration?: TimestampString | null;
    updatedAt: TimestampString;
  } & GmailSyncState_Key;
}

export interface GetLatestEmailData {
  emails: ({
    id: number;
    receivedAt: TimestampString;
  } & Email_Key)[];
}

export interface GetLatestTransactionData {
  transactions: ({
    id: number;
    txnDate: DateString;
  } & Transaction_Key)[];
}

export interface GetMerchantByNameData {
  merchants: ({
    id: number;
    name: string;
    normalizedName: string;
    categoryId?: number | null;
    categoryRef?: {
      id: number;
      name: string;
      icon: string;
      color: string;
    } & Category_Key;
      transactionCount?: number | null;
      totalAmount?: number | null;
  } & Merchant_Key)[];
}

export interface GetMerchantByNameVariables {
  name: string;
}

export interface GetMerchantData {
  merchant?: {
    id: number;
    name: string;
    normalizedName: string;
    categoryId?: number | null;
    categoryRef?: {
      id: number;
      name: string;
      icon: string;
      color: string;
    } & Category_Key;
      transactionCount?: number | null;
      totalAmount?: number | null;
      firstSeenAt: TimestampString;
      createdAt: TimestampString;
      updatedAt: TimestampString;
  } & Merchant_Key;
}

export interface GetMerchantVariables {
  id: number;
}

export interface GetMerchantsCountData {
  merchants: ({
    id: number;
  } & Merchant_Key)[];
}

export interface GetMerchantsCountVariables {
  categoryId?: number | null;
  searchTerm?: string | null;
}

export interface GetRecentEmailsForMonitoringData {
  emails: ({
    id: number;
    gmailMessageId: string;
    senderEmail: string;
    senderName?: string | null;
    subject?: string | null;
    receivedAt: TimestampString;
    provider?: string | null;
    parsed?: boolean | null;
    createdAt: TimestampString;
  } & Email_Key)[];
}

export interface GetRecentEmailsForMonitoringVariables {
  limit?: number | null;
}

export interface GetRecentTransactionsForMonitoringData {
  transactions: ({
    id: number;
    amount: number;
    merchantName?: string | null;
    provider: string;
    txnDate: DateString;
    createdAt: TimestampString;
  } & Transaction_Key)[];
}

export interface GetRecentTransactionsForMonitoringVariables {
  limit?: number | null;
}

export interface GetSpendingByCategoryData {
  merchants: ({
    id: number;
    categoryId?: number | null;
    categoryRef?: {
      id: number;
      name: string;
      icon: string;
      color: string;
    } & Category_Key;
      name: string;
      totalAmount?: number | null;
  } & Merchant_Key)[];
}

export interface GetSpendingByCategoryVariables {
  startDate?: DateString | null;
  endDate?: DateString | null;
}

export interface GetSpendingSummaryData {
  transactions: ({
    amount: number;
    txnDate: DateString;
    txnType: TxnType;
    provider: string;
  })[];
}

export interface GetSpendingSummaryVariables {
  startDate?: DateString | null;
  endDate?: DateString | null;
}

export interface GetTopMerchantsData {
  merchants: ({
    id: number;
    name: string;
    categoryId?: number | null;
    categoryRef?: {
      id: number;
      name: string;
      icon: string;
      color: string;
    } & Category_Key;
      totalAmount?: number | null;
      transactionCount?: number | null;
  } & Merchant_Key)[];
}

export interface GetTopMerchantsVariables {
  limit?: number | null;
  startDate?: DateString | null;
  endDate?: DateString | null;
}

export interface GetTransactionData {
  transaction?: {
    id: number;
    amount: number;
    currency?: string | null;
    txnType: TxnType;
    channel: ChannelType;
    txnDate: DateString;
    txnTimestamp?: TimestampString | null;
    merchantName?: string | null;
    merchantRaw?: string | null;
    provider: string;
    referenceNumber?: string | null;
    cardLast4?: string | null;
    accountLast4?: string | null;
    description?: string | null;
    notes?: string | null;
    idempotencyKey: string;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    merchant?: {
      id: number;
      name: string;
      normalizedName: string;
      categoryId?: number | null;
      categoryRef?: {
        id: number;
        name: string;
        icon: string;
        color: string;
      } & Category_Key;
        transactionCount?: number | null;
        totalAmount?: number | null;
    } & Merchant_Key;
      email: {
        id: number;
        gmailMessageId: string;
        senderEmail: string;
        senderName?: string | null;
        subject?: string | null;
        receivedAt: TimestampString;
        provider?: string | null;
        labels?: string[] | null;
      } & Email_Key;
  } & Transaction_Key;
}

export interface GetTransactionVariables {
  id: number;
}

export interface GetTransactionsAfterDateData {
  transactions: ({
    id: number;
    txnDate: DateString;
  } & Transaction_Key)[];
}

export interface GetTransactionsAfterDateVariables {
  minDate: DateString;
}

export interface GetTransactionsByMerchantData {
  transactions: ({
    id: number;
    merchantId?: number | null;
  } & Transaction_Key)[];
}

export interface GetTransactionsByMerchantVariables {
  merchantId: number;
}

export interface GmailSyncState_Key {
  id: number;
  __typename?: 'GmailSyncState_Key';
}

export interface ListCategoriesData {
  categories: ({
    id: number;
    name: string;
    icon: string;
    color: string;
    description?: string | null;
    isDefault?: boolean | null;
    createdAt: TimestampString;
  } & Category_Key)[];
}

export interface ListEmailsData {
  emails: ({
    id: number;
    gmailMessageId: string;
    senderEmail: string;
    senderName?: string | null;
    subject?: string | null;
    receivedAt: TimestampString;
    provider?: string | null;
    parsed?: boolean | null;
    labels?: string[] | null;
    createdAt: TimestampString;
  } & Email_Key)[];
}

export interface ListEmailsVariables {
  limit?: number | null;
  offset?: number | null;
  provider?: string | null;
  parsed?: boolean | null;
}

export interface ListMerchantsData {
  merchants: ({
    id: number;
    name: string;
    normalizedName: string;
    categoryId?: number | null;
    categoryRef?: {
      id: number;
      name: string;
      icon: string;
      color: string;
    } & Category_Key;
      transactionCount?: number | null;
      totalAmount?: number | null;
      firstSeenAt: TimestampString;
      createdAt: TimestampString;
  } & Merchant_Key)[];
}

export interface ListMerchantsVariables {
  limit?: number | null;
  offset?: number | null;
  categoryId?: number | null;
  searchTerm?: string | null;
  sortBy?: string | null;
  sortOrder?: string | null;
}

export interface ListTransactionsData {
  transactions: ({
    id: number;
    amount: number;
    currency?: string | null;
    txnType: TxnType;
    channel: ChannelType;
    txnDate: DateString;
    txnTimestamp?: TimestampString | null;
    merchantName?: string | null;
    merchantRaw?: string | null;
    provider: string;
    referenceNumber?: string | null;
    cardLast4?: string | null;
    accountLast4?: string | null;
    description?: string | null;
    createdAt: TimestampString;
    merchant?: {
      id: number;
      name: string;
      categoryId?: number | null;
      categoryRef?: {
        id: number;
        name: string;
        icon: string;
        color: string;
      } & Category_Key;
    } & Merchant_Key;
      email: {
        id: number;
        senderEmail: string;
        subject?: string | null;
        receivedAt: TimestampString;
      } & Email_Key;
  } & Transaction_Key)[];
}

export interface ListTransactionsVariables {
  limit?: number | null;
  offset?: number | null;
  startDate?: DateString | null;
  endDate?: DateString | null;
  provider?: string | null;
  txnType?: TxnType | null;
}

export interface Merchant_Key {
  id: number;
  __typename?: 'Merchant_Key';
}

export interface SearchTransactionsData {
  transactions: ({
    id: number;
    amount: number;
    currency?: string | null;
    txnType: TxnType;
    txnDate: DateString;
    merchantName?: string | null;
    description?: string | null;
    merchant?: {
      name: string;
      categoryId?: number | null;
      categoryRef?: {
        id: number;
        name: string;
        icon: string;
        color: string;
      } & Category_Key;
    };
  } & Transaction_Key)[];
}

export interface SearchTransactionsVariables {
  searchTerm?: string | null;
  limit?: number | null;
}

export interface Transaction_Key {
  id: number;
  __typename?: 'Transaction_Key';
}

export interface UpdateCategoryData {
  category_update?: Category_Key | null;
}

export interface UpdateCategoryVariables {
  id: number;
  name?: string | null;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
}

export interface UpdateEmailParsedData {
  email_update?: Email_Key | null;
}

export interface UpdateEmailParsedVariables {
  id: number;
  parsed: boolean;
}

export interface UpdateGmailSyncStateData {
  gmailSyncState_update?: GmailSyncState_Key | null;
}

export interface UpdateGmailSyncStateVariables {
  lastHistoryId: number;
  lastSyncedAt: TimestampString;
  watchExpiration?: TimestampString | null;
}

export interface UpdateMerchantCategoryIdData {
  merchant_update?: Merchant_Key | null;
}

export interface UpdateMerchantCategoryIdVariables {
  id: number;
  categoryId?: number | null;
}

export interface UpdateMerchantNormalizedNameData {
  merchant_update?: Merchant_Key | null;
}

export interface UpdateMerchantNormalizedNameVariables {
  id: number;
  normalizedName: string;
}

export interface UpdateTransactionMerchantData {
  transaction_update?: Transaction_Key | null;
}

export interface UpdateTransactionMerchantVariables {
  id: number;
  merchantId: number;
}

export interface UpdateTransactionNotesData {
  transaction_update?: Transaction_Key | null;
}

export interface UpdateTransactionNotesVariables {
  id: number;
  notes: string;
}

interface CreateEmailRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateEmailVariables): MutationRef<CreateEmailData, CreateEmailVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateEmailVariables): MutationRef<CreateEmailData, CreateEmailVariables>;
  operationName: string;
}
export const createEmailRef: CreateEmailRef;

export function createEmail(vars: CreateEmailVariables): MutationPromise<CreateEmailData, CreateEmailVariables>;
export function createEmail(dc: DataConnect, vars: CreateEmailVariables): MutationPromise<CreateEmailData, CreateEmailVariables>;

interface UpdateEmailParsedRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateEmailParsedVariables): MutationRef<UpdateEmailParsedData, UpdateEmailParsedVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateEmailParsedVariables): MutationRef<UpdateEmailParsedData, UpdateEmailParsedVariables>;
  operationName: string;
}
export const updateEmailParsedRef: UpdateEmailParsedRef;

export function updateEmailParsed(vars: UpdateEmailParsedVariables): MutationPromise<UpdateEmailParsedData, UpdateEmailParsedVariables>;
export function updateEmailParsed(dc: DataConnect, vars: UpdateEmailParsedVariables): MutationPromise<UpdateEmailParsedData, UpdateEmailParsedVariables>;

interface CreateMerchantRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMerchantVariables): MutationRef<CreateMerchantData, CreateMerchantVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateMerchantVariables): MutationRef<CreateMerchantData, CreateMerchantVariables>;
  operationName: string;
}
export const createMerchantRef: CreateMerchantRef;

export function createMerchant(vars: CreateMerchantVariables): MutationPromise<CreateMerchantData, CreateMerchantVariables>;
export function createMerchant(dc: DataConnect, vars: CreateMerchantVariables): MutationPromise<CreateMerchantData, CreateMerchantVariables>;

interface CreateTransactionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateTransactionVariables): MutationRef<CreateTransactionData, CreateTransactionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateTransactionVariables): MutationRef<CreateTransactionData, CreateTransactionVariables>;
  operationName: string;
}
export const createTransactionRef: CreateTransactionRef;

export function createTransaction(vars: CreateTransactionVariables): MutationPromise<CreateTransactionData, CreateTransactionVariables>;
export function createTransaction(dc: DataConnect, vars: CreateTransactionVariables): MutationPromise<CreateTransactionData, CreateTransactionVariables>;

interface UpdateTransactionMerchantRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateTransactionMerchantVariables): MutationRef<UpdateTransactionMerchantData, UpdateTransactionMerchantVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateTransactionMerchantVariables): MutationRef<UpdateTransactionMerchantData, UpdateTransactionMerchantVariables>;
  operationName: string;
}
export const updateTransactionMerchantRef: UpdateTransactionMerchantRef;

export function updateTransactionMerchant(vars: UpdateTransactionMerchantVariables): MutationPromise<UpdateTransactionMerchantData, UpdateTransactionMerchantVariables>;
export function updateTransactionMerchant(dc: DataConnect, vars: UpdateTransactionMerchantVariables): MutationPromise<UpdateTransactionMerchantData, UpdateTransactionMerchantVariables>;

interface UpdateTransactionNotesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateTransactionNotesVariables): MutationRef<UpdateTransactionNotesData, UpdateTransactionNotesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateTransactionNotesVariables): MutationRef<UpdateTransactionNotesData, UpdateTransactionNotesVariables>;
  operationName: string;
}
export const updateTransactionNotesRef: UpdateTransactionNotesRef;

export function updateTransactionNotes(vars: UpdateTransactionNotesVariables): MutationPromise<UpdateTransactionNotesData, UpdateTransactionNotesVariables>;
export function updateTransactionNotes(dc: DataConnect, vars: UpdateTransactionNotesVariables): MutationPromise<UpdateTransactionNotesData, UpdateTransactionNotesVariables>;

interface DeleteTransactionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteTransactionVariables): MutationRef<DeleteTransactionData, DeleteTransactionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteTransactionVariables): MutationRef<DeleteTransactionData, DeleteTransactionVariables>;
  operationName: string;
}
export const deleteTransactionRef: DeleteTransactionRef;

export function deleteTransaction(vars: DeleteTransactionVariables): MutationPromise<DeleteTransactionData, DeleteTransactionVariables>;
export function deleteTransaction(dc: DataConnect, vars: DeleteTransactionVariables): MutationPromise<DeleteTransactionData, DeleteTransactionVariables>;

interface DeleteEmailRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteEmailVariables): MutationRef<DeleteEmailData, DeleteEmailVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteEmailVariables): MutationRef<DeleteEmailData, DeleteEmailVariables>;
  operationName: string;
}
export const deleteEmailRef: DeleteEmailRef;

export function deleteEmail(vars: DeleteEmailVariables): MutationPromise<DeleteEmailData, DeleteEmailVariables>;
export function deleteEmail(dc: DataConnect, vars: DeleteEmailVariables): MutationPromise<DeleteEmailData, DeleteEmailVariables>;

interface UpdateGmailSyncStateRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateGmailSyncStateVariables): MutationRef<UpdateGmailSyncStateData, UpdateGmailSyncStateVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateGmailSyncStateVariables): MutationRef<UpdateGmailSyncStateData, UpdateGmailSyncStateVariables>;
  operationName: string;
}
export const updateGmailSyncStateRef: UpdateGmailSyncStateRef;

export function updateGmailSyncState(vars: UpdateGmailSyncStateVariables): MutationPromise<UpdateGmailSyncStateData, UpdateGmailSyncStateVariables>;
export function updateGmailSyncState(dc: DataConnect, vars: UpdateGmailSyncStateVariables): MutationPromise<UpdateGmailSyncStateData, UpdateGmailSyncStateVariables>;

interface DeleteMerchantRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteMerchantVariables): MutationRef<DeleteMerchantData, DeleteMerchantVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteMerchantVariables): MutationRef<DeleteMerchantData, DeleteMerchantVariables>;
  operationName: string;
}
export const deleteMerchantRef: DeleteMerchantRef;

export function deleteMerchant(vars: DeleteMerchantVariables): MutationPromise<DeleteMerchantData, DeleteMerchantVariables>;
export function deleteMerchant(dc: DataConnect, vars: DeleteMerchantVariables): MutationPromise<DeleteMerchantData, DeleteMerchantVariables>;

interface CreateCategoryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateCategoryVariables): MutationRef<CreateCategoryData, CreateCategoryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateCategoryVariables): MutationRef<CreateCategoryData, CreateCategoryVariables>;
  operationName: string;
}
export const createCategoryRef: CreateCategoryRef;

export function createCategory(vars: CreateCategoryVariables): MutationPromise<CreateCategoryData, CreateCategoryVariables>;
export function createCategory(dc: DataConnect, vars: CreateCategoryVariables): MutationPromise<CreateCategoryData, CreateCategoryVariables>;

interface UpdateCategoryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateCategoryVariables): MutationRef<UpdateCategoryData, UpdateCategoryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateCategoryVariables): MutationRef<UpdateCategoryData, UpdateCategoryVariables>;
  operationName: string;
}
export const updateCategoryRef: UpdateCategoryRef;

export function updateCategory(vars: UpdateCategoryVariables): MutationPromise<UpdateCategoryData, UpdateCategoryVariables>;
export function updateCategory(dc: DataConnect, vars: UpdateCategoryVariables): MutationPromise<UpdateCategoryData, UpdateCategoryVariables>;

interface DeleteCategoryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteCategoryVariables): MutationRef<DeleteCategoryData, DeleteCategoryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteCategoryVariables): MutationRef<DeleteCategoryData, DeleteCategoryVariables>;
  operationName: string;
}
export const deleteCategoryRef: DeleteCategoryRef;

export function deleteCategory(vars: DeleteCategoryVariables): MutationPromise<DeleteCategoryData, DeleteCategoryVariables>;
export function deleteCategory(dc: DataConnect, vars: DeleteCategoryVariables): MutationPromise<DeleteCategoryData, DeleteCategoryVariables>;

interface UpdateMerchantCategoryIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateMerchantCategoryIdVariables): MutationRef<UpdateMerchantCategoryIdData, UpdateMerchantCategoryIdVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateMerchantCategoryIdVariables): MutationRef<UpdateMerchantCategoryIdData, UpdateMerchantCategoryIdVariables>;
  operationName: string;
}
export const updateMerchantCategoryIdRef: UpdateMerchantCategoryIdRef;

export function updateMerchantCategoryId(vars: UpdateMerchantCategoryIdVariables): MutationPromise<UpdateMerchantCategoryIdData, UpdateMerchantCategoryIdVariables>;
export function updateMerchantCategoryId(dc: DataConnect, vars: UpdateMerchantCategoryIdVariables): MutationPromise<UpdateMerchantCategoryIdData, UpdateMerchantCategoryIdVariables>;

interface UpdateMerchantNormalizedNameRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateMerchantNormalizedNameVariables): MutationRef<UpdateMerchantNormalizedNameData, UpdateMerchantNormalizedNameVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateMerchantNormalizedNameVariables): MutationRef<UpdateMerchantNormalizedNameData, UpdateMerchantNormalizedNameVariables>;
  operationName: string;
}
export const updateMerchantNormalizedNameRef: UpdateMerchantNormalizedNameRef;

export function updateMerchantNormalizedName(vars: UpdateMerchantNormalizedNameVariables): MutationPromise<UpdateMerchantNormalizedNameData, UpdateMerchantNormalizedNameVariables>;
export function updateMerchantNormalizedName(dc: DataConnect, vars: UpdateMerchantNormalizedNameVariables): MutationPromise<UpdateMerchantNormalizedNameData, UpdateMerchantNormalizedNameVariables>;

interface ListTransactionsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: ListTransactionsVariables): QueryRef<ListTransactionsData, ListTransactionsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: ListTransactionsVariables): QueryRef<ListTransactionsData, ListTransactionsVariables>;
  operationName: string;
}
export const listTransactionsRef: ListTransactionsRef;

export function listTransactions(vars?: ListTransactionsVariables): QueryPromise<ListTransactionsData, ListTransactionsVariables>;
export function listTransactions(dc: DataConnect, vars?: ListTransactionsVariables): QueryPromise<ListTransactionsData, ListTransactionsVariables>;

interface GetTransactionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetTransactionVariables): QueryRef<GetTransactionData, GetTransactionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetTransactionVariables): QueryRef<GetTransactionData, GetTransactionVariables>;
  operationName: string;
}
export const getTransactionRef: GetTransactionRef;

export function getTransaction(vars: GetTransactionVariables): QueryPromise<GetTransactionData, GetTransactionVariables>;
export function getTransaction(dc: DataConnect, vars: GetTransactionVariables): QueryPromise<GetTransactionData, GetTransactionVariables>;

interface ListMerchantsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: ListMerchantsVariables): QueryRef<ListMerchantsData, ListMerchantsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: ListMerchantsVariables): QueryRef<ListMerchantsData, ListMerchantsVariables>;
  operationName: string;
}
export const listMerchantsRef: ListMerchantsRef;

export function listMerchants(vars?: ListMerchantsVariables): QueryPromise<ListMerchantsData, ListMerchantsVariables>;
export function listMerchants(dc: DataConnect, vars?: ListMerchantsVariables): QueryPromise<ListMerchantsData, ListMerchantsVariables>;

interface GetMerchantsCountRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: GetMerchantsCountVariables): QueryRef<GetMerchantsCountData, GetMerchantsCountVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: GetMerchantsCountVariables): QueryRef<GetMerchantsCountData, GetMerchantsCountVariables>;
  operationName: string;
}
export const getMerchantsCountRef: GetMerchantsCountRef;

export function getMerchantsCount(vars?: GetMerchantsCountVariables): QueryPromise<GetMerchantsCountData, GetMerchantsCountVariables>;
export function getMerchantsCount(dc: DataConnect, vars?: GetMerchantsCountVariables): QueryPromise<GetMerchantsCountData, GetMerchantsCountVariables>;

interface GetMerchantRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMerchantVariables): QueryRef<GetMerchantData, GetMerchantVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMerchantVariables): QueryRef<GetMerchantData, GetMerchantVariables>;
  operationName: string;
}
export const getMerchantRef: GetMerchantRef;

export function getMerchant(vars: GetMerchantVariables): QueryPromise<GetMerchantData, GetMerchantVariables>;
export function getMerchant(dc: DataConnect, vars: GetMerchantVariables): QueryPromise<GetMerchantData, GetMerchantVariables>;

interface GetMerchantByNameRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMerchantByNameVariables): QueryRef<GetMerchantByNameData, GetMerchantByNameVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMerchantByNameVariables): QueryRef<GetMerchantByNameData, GetMerchantByNameVariables>;
  operationName: string;
}
export const getMerchantByNameRef: GetMerchantByNameRef;

export function getMerchantByName(vars: GetMerchantByNameVariables): QueryPromise<GetMerchantByNameData, GetMerchantByNameVariables>;
export function getMerchantByName(dc: DataConnect, vars: GetMerchantByNameVariables): QueryPromise<GetMerchantByNameData, GetMerchantByNameVariables>;

interface GetSpendingSummaryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: GetSpendingSummaryVariables): QueryRef<GetSpendingSummaryData, GetSpendingSummaryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: GetSpendingSummaryVariables): QueryRef<GetSpendingSummaryData, GetSpendingSummaryVariables>;
  operationName: string;
}
export const getSpendingSummaryRef: GetSpendingSummaryRef;

export function getSpendingSummary(vars?: GetSpendingSummaryVariables): QueryPromise<GetSpendingSummaryData, GetSpendingSummaryVariables>;
export function getSpendingSummary(dc: DataConnect, vars?: GetSpendingSummaryVariables): QueryPromise<GetSpendingSummaryData, GetSpendingSummaryVariables>;

interface GetTopMerchantsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: GetTopMerchantsVariables): QueryRef<GetTopMerchantsData, GetTopMerchantsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: GetTopMerchantsVariables): QueryRef<GetTopMerchantsData, GetTopMerchantsVariables>;
  operationName: string;
}
export const getTopMerchantsRef: GetTopMerchantsRef;

export function getTopMerchants(vars?: GetTopMerchantsVariables): QueryPromise<GetTopMerchantsData, GetTopMerchantsVariables>;
export function getTopMerchants(dc: DataConnect, vars?: GetTopMerchantsVariables): QueryPromise<GetTopMerchantsData, GetTopMerchantsVariables>;

interface GetSpendingByCategoryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: GetSpendingByCategoryVariables): QueryRef<GetSpendingByCategoryData, GetSpendingByCategoryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: GetSpendingByCategoryVariables): QueryRef<GetSpendingByCategoryData, GetSpendingByCategoryVariables>;
  operationName: string;
}
export const getSpendingByCategoryRef: GetSpendingByCategoryRef;

export function getSpendingByCategory(vars?: GetSpendingByCategoryVariables): QueryPromise<GetSpendingByCategoryData, GetSpendingByCategoryVariables>;
export function getSpendingByCategory(dc: DataConnect, vars?: GetSpendingByCategoryVariables): QueryPromise<GetSpendingByCategoryData, GetSpendingByCategoryVariables>;

interface ListEmailsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: ListEmailsVariables): QueryRef<ListEmailsData, ListEmailsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: ListEmailsVariables): QueryRef<ListEmailsData, ListEmailsVariables>;
  operationName: string;
}
export const listEmailsRef: ListEmailsRef;

export function listEmails(vars?: ListEmailsVariables): QueryPromise<ListEmailsData, ListEmailsVariables>;
export function listEmails(dc: DataConnect, vars?: ListEmailsVariables): QueryPromise<ListEmailsData, ListEmailsVariables>;

interface GetEmailRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetEmailVariables): QueryRef<GetEmailData, GetEmailVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetEmailVariables): QueryRef<GetEmailData, GetEmailVariables>;
  operationName: string;
}
export const getEmailRef: GetEmailRef;

export function getEmail(vars: GetEmailVariables): QueryPromise<GetEmailData, GetEmailVariables>;
export function getEmail(dc: DataConnect, vars: GetEmailVariables): QueryPromise<GetEmailData, GetEmailVariables>;

interface SearchTransactionsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: SearchTransactionsVariables): QueryRef<SearchTransactionsData, SearchTransactionsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: SearchTransactionsVariables): QueryRef<SearchTransactionsData, SearchTransactionsVariables>;
  operationName: string;
}
export const searchTransactionsRef: SearchTransactionsRef;

export function searchTransactions(vars?: SearchTransactionsVariables): QueryPromise<SearchTransactionsData, SearchTransactionsVariables>;
export function searchTransactions(dc: DataConnect, vars?: SearchTransactionsVariables): QueryPromise<SearchTransactionsData, SearchTransactionsVariables>;

interface GetDailySpendingRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetDailySpendingVariables): QueryRef<GetDailySpendingData, GetDailySpendingVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetDailySpendingVariables): QueryRef<GetDailySpendingData, GetDailySpendingVariables>;
  operationName: string;
}
export const getDailySpendingRef: GetDailySpendingRef;

export function getDailySpending(vars: GetDailySpendingVariables): QueryPromise<GetDailySpendingData, GetDailySpendingVariables>;
export function getDailySpending(dc: DataConnect, vars: GetDailySpendingVariables): QueryPromise<GetDailySpendingData, GetDailySpendingVariables>;

interface GetGmailSyncStateRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetGmailSyncStateData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetGmailSyncStateData, undefined>;
  operationName: string;
}
export const getGmailSyncStateRef: GetGmailSyncStateRef;

export function getGmailSyncState(): QueryPromise<GetGmailSyncStateData, undefined>;
export function getGmailSyncState(dc: DataConnect): QueryPromise<GetGmailSyncStateData, undefined>;

interface GetTransactionsByMerchantRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetTransactionsByMerchantVariables): QueryRef<GetTransactionsByMerchantData, GetTransactionsByMerchantVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetTransactionsByMerchantVariables): QueryRef<GetTransactionsByMerchantData, GetTransactionsByMerchantVariables>;
  operationName: string;
}
export const getTransactionsByMerchantRef: GetTransactionsByMerchantRef;

export function getTransactionsByMerchant(vars: GetTransactionsByMerchantVariables): QueryPromise<GetTransactionsByMerchantData, GetTransactionsByMerchantVariables>;
export function getTransactionsByMerchant(dc: DataConnect, vars: GetTransactionsByMerchantVariables): QueryPromise<GetTransactionsByMerchantData, GetTransactionsByMerchantVariables>;

interface ListCategoriesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCategoriesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListCategoriesData, undefined>;
  operationName: string;
}
export const listCategoriesRef: ListCategoriesRef;

export function listCategories(): QueryPromise<ListCategoriesData, undefined>;
export function listCategories(dc: DataConnect): QueryPromise<ListCategoriesData, undefined>;

interface GetCategoryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetCategoryVariables): QueryRef<GetCategoryData, GetCategoryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetCategoryVariables): QueryRef<GetCategoryData, GetCategoryVariables>;
  operationName: string;
}
export const getCategoryRef: GetCategoryRef;

export function getCategory(vars: GetCategoryVariables): QueryPromise<GetCategoryData, GetCategoryVariables>;
export function getCategory(dc: DataConnect, vars: GetCategoryVariables): QueryPromise<GetCategoryData, GetCategoryVariables>;

interface GetCategoryByNameRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetCategoryByNameVariables): QueryRef<GetCategoryByNameData, GetCategoryByNameVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetCategoryByNameVariables): QueryRef<GetCategoryByNameData, GetCategoryByNameVariables>;
  operationName: string;
}
export const getCategoryByNameRef: GetCategoryByNameRef;

export function getCategoryByName(vars: GetCategoryByNameVariables): QueryPromise<GetCategoryByNameData, GetCategoryByNameVariables>;
export function getCategoryByName(dc: DataConnect, vars: GetCategoryByNameVariables): QueryPromise<GetCategoryByNameData, GetCategoryByNameVariables>;

interface GetRecentEmailsForMonitoringRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: GetRecentEmailsForMonitoringVariables): QueryRef<GetRecentEmailsForMonitoringData, GetRecentEmailsForMonitoringVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: GetRecentEmailsForMonitoringVariables): QueryRef<GetRecentEmailsForMonitoringData, GetRecentEmailsForMonitoringVariables>;
  operationName: string;
}
export const getRecentEmailsForMonitoringRef: GetRecentEmailsForMonitoringRef;

export function getRecentEmailsForMonitoring(vars?: GetRecentEmailsForMonitoringVariables): QueryPromise<GetRecentEmailsForMonitoringData, GetRecentEmailsForMonitoringVariables>;
export function getRecentEmailsForMonitoring(dc: DataConnect, vars?: GetRecentEmailsForMonitoringVariables): QueryPromise<GetRecentEmailsForMonitoringData, GetRecentEmailsForMonitoringVariables>;

interface GetRecentTransactionsForMonitoringRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: GetRecentTransactionsForMonitoringVariables): QueryRef<GetRecentTransactionsForMonitoringData, GetRecentTransactionsForMonitoringVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: GetRecentTransactionsForMonitoringVariables): QueryRef<GetRecentTransactionsForMonitoringData, GetRecentTransactionsForMonitoringVariables>;
  operationName: string;
}
export const getRecentTransactionsForMonitoringRef: GetRecentTransactionsForMonitoringRef;

export function getRecentTransactionsForMonitoring(vars?: GetRecentTransactionsForMonitoringVariables): QueryPromise<GetRecentTransactionsForMonitoringData, GetRecentTransactionsForMonitoringVariables>;
export function getRecentTransactionsForMonitoring(dc: DataConnect, vars?: GetRecentTransactionsForMonitoringVariables): QueryPromise<GetRecentTransactionsForMonitoringData, GetRecentTransactionsForMonitoringVariables>;

interface GetAllEmailsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetAllEmailsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetAllEmailsData, undefined>;
  operationName: string;
}
export const getAllEmailsRef: GetAllEmailsRef;

export function getAllEmails(): QueryPromise<GetAllEmailsData, undefined>;
export function getAllEmails(dc: DataConnect): QueryPromise<GetAllEmailsData, undefined>;

interface GetEmailsAfterDateRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetEmailsAfterDateVariables): QueryRef<GetEmailsAfterDateData, GetEmailsAfterDateVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetEmailsAfterDateVariables): QueryRef<GetEmailsAfterDateData, GetEmailsAfterDateVariables>;
  operationName: string;
}
export const getEmailsAfterDateRef: GetEmailsAfterDateRef;

export function getEmailsAfterDate(vars: GetEmailsAfterDateVariables): QueryPromise<GetEmailsAfterDateData, GetEmailsAfterDateVariables>;
export function getEmailsAfterDate(dc: DataConnect, vars: GetEmailsAfterDateVariables): QueryPromise<GetEmailsAfterDateData, GetEmailsAfterDateVariables>;

interface GetLatestEmailRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetLatestEmailData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetLatestEmailData, undefined>;
  operationName: string;
}
export const getLatestEmailRef: GetLatestEmailRef;

export function getLatestEmail(): QueryPromise<GetLatestEmailData, undefined>;
export function getLatestEmail(dc: DataConnect): QueryPromise<GetLatestEmailData, undefined>;

interface GetAllTransactionsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetAllTransactionsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetAllTransactionsData, undefined>;
  operationName: string;
}
export const getAllTransactionsRef: GetAllTransactionsRef;

export function getAllTransactions(): QueryPromise<GetAllTransactionsData, undefined>;
export function getAllTransactions(dc: DataConnect): QueryPromise<GetAllTransactionsData, undefined>;

interface GetTransactionsAfterDateRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetTransactionsAfterDateVariables): QueryRef<GetTransactionsAfterDateData, GetTransactionsAfterDateVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetTransactionsAfterDateVariables): QueryRef<GetTransactionsAfterDateData, GetTransactionsAfterDateVariables>;
  operationName: string;
}
export const getTransactionsAfterDateRef: GetTransactionsAfterDateRef;

export function getTransactionsAfterDate(vars: GetTransactionsAfterDateVariables): QueryPromise<GetTransactionsAfterDateData, GetTransactionsAfterDateVariables>;
export function getTransactionsAfterDate(dc: DataConnect, vars: GetTransactionsAfterDateVariables): QueryPromise<GetTransactionsAfterDateData, GetTransactionsAfterDateVariables>;

interface GetLatestTransactionRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetLatestTransactionData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetLatestTransactionData, undefined>;
  operationName: string;
}
export const getLatestTransactionRef: GetLatestTransactionRef;

export function getLatestTransaction(): QueryPromise<GetLatestTransactionData, undefined>;
export function getLatestTransaction(dc: DataConnect): QueryPromise<GetLatestTransactionData, undefined>;

