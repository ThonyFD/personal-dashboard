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
  INCOME = "INCOME",
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

export interface CreateManualTransactionData {
  manualTransaction_insert: ManualTransaction_Key;
}

export interface CreateManualTransactionVariables {
  id: number;
  year: number;
  month: number;
  day?: number | null;
  description: string;
  amount: number;
  transactionType?: string | null;
  paymentMethod?: string | null;
  isPaid?: boolean | null;
  notes?: string | null;
  merchantId?: number | null;
  categoryId?: number | null;
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

export interface CreateMonthlyIncomeData {
  monthlyIncome_insert: MonthlyIncome_Key;
}

export interface CreateMonthlyIncomeVariables {
  id: number;
  year: number;
  month: number;
  source: string;
  amount: number;
  notes?: string | null;
}

export interface CreateNotificationPreferencesData {
  notificationPreference_insert: NotificationPreference_Key;
}

export interface CreateNotificationPreferencesVariables {
  id: number;
  userEmail: string;
  enableDailyReminders?: boolean | null;
  reminderTime?: string | null;
  timezone?: string | null;
}

export interface CreatePushSubscriptionData {
  pushSubscription_insert: PushSubscription_Key;
}

export interface CreatePushSubscriptionVariables {
  id: number;
  userEmail: string;
  endpoint: string;
  keys: unknown;
  userAgent?: string | null;
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

export interface DeactivatePushSubscriptionData {
  pushSubscription_update?: PushSubscription_Key | null;
}

export interface DeactivatePushSubscriptionVariables {
  id: number;
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

export interface DeleteManualTransactionData {
  manualTransaction_delete?: ManualTransaction_Key | null;
}

export interface DeleteManualTransactionVariables {
  id: number;
}

export interface DeleteMerchantData {
  merchant_delete?: Merchant_Key | null;
}

export interface DeleteMerchantVariables {
  id: number;
}

export interface DeleteMonthlyIncomeData {
  monthlyIncome_delete?: MonthlyIncome_Key | null;
}

export interface DeleteMonthlyIncomeVariables {
  id: number;
}

export interface DeletePushSubscriptionData {
  pushSubscription_delete?: PushSubscription_Key | null;
}

export interface DeletePushSubscriptionVariables {
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

export interface GetActivePushSubscriptionsData {
  pushSubscriptions: ({
    id: number;
    endpoint: string;
    keys: unknown;
    isActive?: boolean | null;
    createdAt: TimestampString;
  } & PushSubscription_Key)[];
}

export interface GetActivePushSubscriptionsVariables {
  userEmail: string;
}

export interface GetAllActivePushSubscriptionsData {
  pushSubscriptions: ({
    id: number;
    userEmail: string;
    endpoint: string;
    keys: unknown;
    isActive?: boolean | null;
    createdAt: TimestampString;
  } & PushSubscription_Key)[];
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

export interface GetDailyIncomeData {
  transactions: ({
    txnDate: DateString;
    amount: number;
    txnType: TxnType;
    merchantName?: string | null;
    provider: string;
    referenceNumber?: string | null;
  })[];
}

export interface GetDailyIncomeVariables {
  startDate: DateString;
  endDate: DateString;
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

export interface GetIncomeSummaryData {
  transactions: ({
    amount: number;
    txnDate: DateString;
    txnType: TxnType;
    provider: string;
    merchantName?: string | null;
  })[];
}

export interface GetIncomeSummaryVariables {
  startDate?: DateString | null;
  endDate?: DateString | null;
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

export interface GetManualTransactionsData {
  manualTransactions: ({
    id: number;
    year: number;
    month: number;
    day?: number | null;
    description: string;
    amount: number;
    transactionType?: string | null;
    paymentMethod?: string | null;
    isPaid?: boolean | null;
    notes?: string | null;
    merchantId?: number | null;
    categoryId?: number | null;
    category?: {
      id: number;
      name: string;
      icon: string;
      color: string;
    } & Category_Key;
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
        createdAt: TimestampString;
        updatedAt: TimestampString;
  } & ManualTransaction_Key)[];
}

export interface GetManualTransactionsVariables {
  year: number;
  month: number;
  isPaid?: boolean | null;
}

export interface GetMaxManualTransactionIdData {
  manualTransactions: ({
    id: number;
  } & ManualTransaction_Key)[];
}

export interface GetMaxMonthlyIncomeIdData {
  monthlyIncomes: ({
    id: number;
  } & MonthlyIncome_Key)[];
}

export interface GetMaxPushSubscriptionIdData {
  pushSubscriptions: ({
    id: number;
  } & PushSubscription_Key)[];
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

export interface GetMonthlyIncomeData {
  transactions: ({
    id: number;
    amount: number;
    currency?: string | null;
    txnType: TxnType;
    channel: ChannelType;
    txnDate: DateString;
    displayDay?: number | null;
    merchantName?: string | null;
    provider: string;
    description?: string | null;
    referenceNumber?: string | null;
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
      createdAt: TimestampString;
  } & Transaction_Key)[];
}

export interface GetMonthlyIncomeVariables {
  startDate: DateString;
  endDate: DateString;
}

export interface GetMonthlyIncomesData {
  monthlyIncomes: ({
    id: number;
    year: number;
    month: number;
    source: string;
    amount: number;
    notes?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & MonthlyIncome_Key)[];
}

export interface GetMonthlyIncomesVariables {
  year: number;
  month: number;
}

export interface GetMonthlyTransactionsData {
  transactions: ({
    id: number;
    amount: number;
    currency?: string | null;
    txnType: TxnType;
    channel: ChannelType;
    txnDate: DateString;
    displayDay?: number | null;
    merchantName?: string | null;
    provider: string;
    description?: string | null;
    isPaid?: boolean | null;
    manualOverride?: boolean | null;
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
      createdAt: TimestampString;
  } & Transaction_Key)[];
}

export interface GetMonthlyTransactionsVariables {
  startDate: DateString;
  endDate: DateString;
}

export interface GetNotificationPreferencesData {
  notificationPreferences: ({
    id: number;
    userEmail: string;
    enableDailyReminders?: boolean | null;
    reminderTime?: string | null;
    timezone?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & NotificationPreference_Key)[];
}

export interface GetNotificationPreferencesVariables {
  userEmail: string;
}

export interface GetPendingPaymentsForDayData {
  manualTransactions: ({
    id: number;
    description: string;
    amount: number;
    paymentMethod?: string | null;
    transactionType?: string | null;
    notes?: string | null;
  } & ManualTransaction_Key)[];
}

export interface GetPendingPaymentsForDayVariables {
  year: number;
  month: number;
  day: number;
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

export interface ManualTransaction_Key {
  id: number;
  __typename?: 'ManualTransaction_Key';
}

export interface Merchant_Key {
  id: number;
  __typename?: 'Merchant_Key';
}

export interface MonthlyIncome_Key {
  id: number;
  __typename?: 'MonthlyIncome_Key';
}

export interface NotificationPreference_Key {
  id: number;
  __typename?: 'NotificationPreference_Key';
}

export interface PushSubscription_Key {
  id: number;
  __typename?: 'PushSubscription_Key';
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

export interface UpdateManualTransactionData {
  manualTransaction_update?: ManualTransaction_Key | null;
}

export interface UpdateManualTransactionPaidStatusData {
  manualTransaction_update?: ManualTransaction_Key | null;
}

export interface UpdateManualTransactionPaidStatusVariables {
  id: number;
  isPaid: boolean;
}

export interface UpdateManualTransactionVariables {
  id: number;
  day?: number | null;
  description?: string | null;
  amount?: number | null;
  transactionType?: string | null;
  paymentMethod?: string | null;
  isPaid?: boolean | null;
  notes?: string | null;
  merchantId?: number | null;
  categoryId?: number | null;
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

export interface UpdateMonthlyIncomeData {
  monthlyIncome_update?: MonthlyIncome_Key | null;
}

export interface UpdateMonthlyIncomeVariables {
  id: number;
  source?: string | null;
  amount?: number | null;
  notes?: string | null;
}

export interface UpdateNotificationPreferencesData {
  notificationPreference_update?: NotificationPreference_Key | null;
}

export interface UpdateNotificationPreferencesVariables {
  id: number;
  enableDailyReminders?: boolean | null;
  reminderTime?: string | null;
  timezone?: string | null;
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

export interface UpdateTransactionPaidStatusData {
  transaction_update?: Transaction_Key | null;
}

export interface UpdateTransactionPaidStatusVariables {
  id: number;
  isPaid: boolean;
}

export interface UpdateTransactionTypeData {
  transaction_update?: Transaction_Key | null;
}

export interface UpdateTransactionTypeVariables {
  id: number;
  txnType: TxnType;
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

interface UpdateTransactionTypeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateTransactionTypeVariables): MutationRef<UpdateTransactionTypeData, UpdateTransactionTypeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateTransactionTypeVariables): MutationRef<UpdateTransactionTypeData, UpdateTransactionTypeVariables>;
  operationName: string;
}
export const updateTransactionTypeRef: UpdateTransactionTypeRef;

export function updateTransactionType(vars: UpdateTransactionTypeVariables): MutationPromise<UpdateTransactionTypeData, UpdateTransactionTypeVariables>;
export function updateTransactionType(dc: DataConnect, vars: UpdateTransactionTypeVariables): MutationPromise<UpdateTransactionTypeData, UpdateTransactionTypeVariables>;

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

interface CreateMonthlyIncomeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMonthlyIncomeVariables): MutationRef<CreateMonthlyIncomeData, CreateMonthlyIncomeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateMonthlyIncomeVariables): MutationRef<CreateMonthlyIncomeData, CreateMonthlyIncomeVariables>;
  operationName: string;
}
export const createMonthlyIncomeRef: CreateMonthlyIncomeRef;

export function createMonthlyIncome(vars: CreateMonthlyIncomeVariables): MutationPromise<CreateMonthlyIncomeData, CreateMonthlyIncomeVariables>;
export function createMonthlyIncome(dc: DataConnect, vars: CreateMonthlyIncomeVariables): MutationPromise<CreateMonthlyIncomeData, CreateMonthlyIncomeVariables>;

interface UpdateMonthlyIncomeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateMonthlyIncomeVariables): MutationRef<UpdateMonthlyIncomeData, UpdateMonthlyIncomeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateMonthlyIncomeVariables): MutationRef<UpdateMonthlyIncomeData, UpdateMonthlyIncomeVariables>;
  operationName: string;
}
export const updateMonthlyIncomeRef: UpdateMonthlyIncomeRef;

export function updateMonthlyIncome(vars: UpdateMonthlyIncomeVariables): MutationPromise<UpdateMonthlyIncomeData, UpdateMonthlyIncomeVariables>;
export function updateMonthlyIncome(dc: DataConnect, vars: UpdateMonthlyIncomeVariables): MutationPromise<UpdateMonthlyIncomeData, UpdateMonthlyIncomeVariables>;

interface DeleteMonthlyIncomeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteMonthlyIncomeVariables): MutationRef<DeleteMonthlyIncomeData, DeleteMonthlyIncomeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteMonthlyIncomeVariables): MutationRef<DeleteMonthlyIncomeData, DeleteMonthlyIncomeVariables>;
  operationName: string;
}
export const deleteMonthlyIncomeRef: DeleteMonthlyIncomeRef;

export function deleteMonthlyIncome(vars: DeleteMonthlyIncomeVariables): MutationPromise<DeleteMonthlyIncomeData, DeleteMonthlyIncomeVariables>;
export function deleteMonthlyIncome(dc: DataConnect, vars: DeleteMonthlyIncomeVariables): MutationPromise<DeleteMonthlyIncomeData, DeleteMonthlyIncomeVariables>;

interface CreateManualTransactionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateManualTransactionVariables): MutationRef<CreateManualTransactionData, CreateManualTransactionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateManualTransactionVariables): MutationRef<CreateManualTransactionData, CreateManualTransactionVariables>;
  operationName: string;
}
export const createManualTransactionRef: CreateManualTransactionRef;

export function createManualTransaction(vars: CreateManualTransactionVariables): MutationPromise<CreateManualTransactionData, CreateManualTransactionVariables>;
export function createManualTransaction(dc: DataConnect, vars: CreateManualTransactionVariables): MutationPromise<CreateManualTransactionData, CreateManualTransactionVariables>;

interface UpdateManualTransactionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateManualTransactionVariables): MutationRef<UpdateManualTransactionData, UpdateManualTransactionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateManualTransactionVariables): MutationRef<UpdateManualTransactionData, UpdateManualTransactionVariables>;
  operationName: string;
}
export const updateManualTransactionRef: UpdateManualTransactionRef;

export function updateManualTransaction(vars: UpdateManualTransactionVariables): MutationPromise<UpdateManualTransactionData, UpdateManualTransactionVariables>;
export function updateManualTransaction(dc: DataConnect, vars: UpdateManualTransactionVariables): MutationPromise<UpdateManualTransactionData, UpdateManualTransactionVariables>;

interface DeleteManualTransactionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteManualTransactionVariables): MutationRef<DeleteManualTransactionData, DeleteManualTransactionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteManualTransactionVariables): MutationRef<DeleteManualTransactionData, DeleteManualTransactionVariables>;
  operationName: string;
}
export const deleteManualTransactionRef: DeleteManualTransactionRef;

export function deleteManualTransaction(vars: DeleteManualTransactionVariables): MutationPromise<DeleteManualTransactionData, DeleteManualTransactionVariables>;
export function deleteManualTransaction(dc: DataConnect, vars: DeleteManualTransactionVariables): MutationPromise<DeleteManualTransactionData, DeleteManualTransactionVariables>;

interface UpdateTransactionPaidStatusRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateTransactionPaidStatusVariables): MutationRef<UpdateTransactionPaidStatusData, UpdateTransactionPaidStatusVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateTransactionPaidStatusVariables): MutationRef<UpdateTransactionPaidStatusData, UpdateTransactionPaidStatusVariables>;
  operationName: string;
}
export const updateTransactionPaidStatusRef: UpdateTransactionPaidStatusRef;

export function updateTransactionPaidStatus(vars: UpdateTransactionPaidStatusVariables): MutationPromise<UpdateTransactionPaidStatusData, UpdateTransactionPaidStatusVariables>;
export function updateTransactionPaidStatus(dc: DataConnect, vars: UpdateTransactionPaidStatusVariables): MutationPromise<UpdateTransactionPaidStatusData, UpdateTransactionPaidStatusVariables>;

interface UpdateManualTransactionPaidStatusRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateManualTransactionPaidStatusVariables): MutationRef<UpdateManualTransactionPaidStatusData, UpdateManualTransactionPaidStatusVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateManualTransactionPaidStatusVariables): MutationRef<UpdateManualTransactionPaidStatusData, UpdateManualTransactionPaidStatusVariables>;
  operationName: string;
}
export const updateManualTransactionPaidStatusRef: UpdateManualTransactionPaidStatusRef;

export function updateManualTransactionPaidStatus(vars: UpdateManualTransactionPaidStatusVariables): MutationPromise<UpdateManualTransactionPaidStatusData, UpdateManualTransactionPaidStatusVariables>;
export function updateManualTransactionPaidStatus(dc: DataConnect, vars: UpdateManualTransactionPaidStatusVariables): MutationPromise<UpdateManualTransactionPaidStatusData, UpdateManualTransactionPaidStatusVariables>;

interface CreatePushSubscriptionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreatePushSubscriptionVariables): MutationRef<CreatePushSubscriptionData, CreatePushSubscriptionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreatePushSubscriptionVariables): MutationRef<CreatePushSubscriptionData, CreatePushSubscriptionVariables>;
  operationName: string;
}
export const createPushSubscriptionRef: CreatePushSubscriptionRef;

export function createPushSubscription(vars: CreatePushSubscriptionVariables): MutationPromise<CreatePushSubscriptionData, CreatePushSubscriptionVariables>;
export function createPushSubscription(dc: DataConnect, vars: CreatePushSubscriptionVariables): MutationPromise<CreatePushSubscriptionData, CreatePushSubscriptionVariables>;

interface DeactivatePushSubscriptionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeactivatePushSubscriptionVariables): MutationRef<DeactivatePushSubscriptionData, DeactivatePushSubscriptionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeactivatePushSubscriptionVariables): MutationRef<DeactivatePushSubscriptionData, DeactivatePushSubscriptionVariables>;
  operationName: string;
}
export const deactivatePushSubscriptionRef: DeactivatePushSubscriptionRef;

export function deactivatePushSubscription(vars: DeactivatePushSubscriptionVariables): MutationPromise<DeactivatePushSubscriptionData, DeactivatePushSubscriptionVariables>;
export function deactivatePushSubscription(dc: DataConnect, vars: DeactivatePushSubscriptionVariables): MutationPromise<DeactivatePushSubscriptionData, DeactivatePushSubscriptionVariables>;

interface DeletePushSubscriptionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeletePushSubscriptionVariables): MutationRef<DeletePushSubscriptionData, DeletePushSubscriptionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeletePushSubscriptionVariables): MutationRef<DeletePushSubscriptionData, DeletePushSubscriptionVariables>;
  operationName: string;
}
export const deletePushSubscriptionRef: DeletePushSubscriptionRef;

export function deletePushSubscription(vars: DeletePushSubscriptionVariables): MutationPromise<DeletePushSubscriptionData, DeletePushSubscriptionVariables>;
export function deletePushSubscription(dc: DataConnect, vars: DeletePushSubscriptionVariables): MutationPromise<DeletePushSubscriptionData, DeletePushSubscriptionVariables>;

interface CreateNotificationPreferencesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateNotificationPreferencesVariables): MutationRef<CreateNotificationPreferencesData, CreateNotificationPreferencesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateNotificationPreferencesVariables): MutationRef<CreateNotificationPreferencesData, CreateNotificationPreferencesVariables>;
  operationName: string;
}
export const createNotificationPreferencesRef: CreateNotificationPreferencesRef;

export function createNotificationPreferences(vars: CreateNotificationPreferencesVariables): MutationPromise<CreateNotificationPreferencesData, CreateNotificationPreferencesVariables>;
export function createNotificationPreferences(dc: DataConnect, vars: CreateNotificationPreferencesVariables): MutationPromise<CreateNotificationPreferencesData, CreateNotificationPreferencesVariables>;

interface UpdateNotificationPreferencesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateNotificationPreferencesVariables): MutationRef<UpdateNotificationPreferencesData, UpdateNotificationPreferencesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateNotificationPreferencesVariables): MutationRef<UpdateNotificationPreferencesData, UpdateNotificationPreferencesVariables>;
  operationName: string;
}
export const updateNotificationPreferencesRef: UpdateNotificationPreferencesRef;

export function updateNotificationPreferences(vars: UpdateNotificationPreferencesVariables): MutationPromise<UpdateNotificationPreferencesData, UpdateNotificationPreferencesVariables>;
export function updateNotificationPreferences(dc: DataConnect, vars: UpdateNotificationPreferencesVariables): MutationPromise<UpdateNotificationPreferencesData, UpdateNotificationPreferencesVariables>;

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

interface GetIncomeSummaryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: GetIncomeSummaryVariables): QueryRef<GetIncomeSummaryData, GetIncomeSummaryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: GetIncomeSummaryVariables): QueryRef<GetIncomeSummaryData, GetIncomeSummaryVariables>;
  operationName: string;
}
export const getIncomeSummaryRef: GetIncomeSummaryRef;

export function getIncomeSummary(vars?: GetIncomeSummaryVariables): QueryPromise<GetIncomeSummaryData, GetIncomeSummaryVariables>;
export function getIncomeSummary(dc: DataConnect, vars?: GetIncomeSummaryVariables): QueryPromise<GetIncomeSummaryData, GetIncomeSummaryVariables>;

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

interface GetDailyIncomeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetDailyIncomeVariables): QueryRef<GetDailyIncomeData, GetDailyIncomeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetDailyIncomeVariables): QueryRef<GetDailyIncomeData, GetDailyIncomeVariables>;
  operationName: string;
}
export const getDailyIncomeRef: GetDailyIncomeRef;

export function getDailyIncome(vars: GetDailyIncomeVariables): QueryPromise<GetDailyIncomeData, GetDailyIncomeVariables>;
export function getDailyIncome(dc: DataConnect, vars: GetDailyIncomeVariables): QueryPromise<GetDailyIncomeData, GetDailyIncomeVariables>;

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

interface GetMaxMonthlyIncomeIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMaxMonthlyIncomeIdData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetMaxMonthlyIncomeIdData, undefined>;
  operationName: string;
}
export const getMaxMonthlyIncomeIdRef: GetMaxMonthlyIncomeIdRef;

export function getMaxMonthlyIncomeId(): QueryPromise<GetMaxMonthlyIncomeIdData, undefined>;
export function getMaxMonthlyIncomeId(dc: DataConnect): QueryPromise<GetMaxMonthlyIncomeIdData, undefined>;

interface GetMaxManualTransactionIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMaxManualTransactionIdData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetMaxManualTransactionIdData, undefined>;
  operationName: string;
}
export const getMaxManualTransactionIdRef: GetMaxManualTransactionIdRef;

export function getMaxManualTransactionId(): QueryPromise<GetMaxManualTransactionIdData, undefined>;
export function getMaxManualTransactionId(dc: DataConnect): QueryPromise<GetMaxManualTransactionIdData, undefined>;

interface GetMonthlyIncomesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMonthlyIncomesVariables): QueryRef<GetMonthlyIncomesData, GetMonthlyIncomesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMonthlyIncomesVariables): QueryRef<GetMonthlyIncomesData, GetMonthlyIncomesVariables>;
  operationName: string;
}
export const getMonthlyIncomesRef: GetMonthlyIncomesRef;

export function getMonthlyIncomes(vars: GetMonthlyIncomesVariables): QueryPromise<GetMonthlyIncomesData, GetMonthlyIncomesVariables>;
export function getMonthlyIncomes(dc: DataConnect, vars: GetMonthlyIncomesVariables): QueryPromise<GetMonthlyIncomesData, GetMonthlyIncomesVariables>;

interface GetManualTransactionsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetManualTransactionsVariables): QueryRef<GetManualTransactionsData, GetManualTransactionsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetManualTransactionsVariables): QueryRef<GetManualTransactionsData, GetManualTransactionsVariables>;
  operationName: string;
}
export const getManualTransactionsRef: GetManualTransactionsRef;

export function getManualTransactions(vars: GetManualTransactionsVariables): QueryPromise<GetManualTransactionsData, GetManualTransactionsVariables>;
export function getManualTransactions(dc: DataConnect, vars: GetManualTransactionsVariables): QueryPromise<GetManualTransactionsData, GetManualTransactionsVariables>;

interface GetMonthlyTransactionsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMonthlyTransactionsVariables): QueryRef<GetMonthlyTransactionsData, GetMonthlyTransactionsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMonthlyTransactionsVariables): QueryRef<GetMonthlyTransactionsData, GetMonthlyTransactionsVariables>;
  operationName: string;
}
export const getMonthlyTransactionsRef: GetMonthlyTransactionsRef;

export function getMonthlyTransactions(vars: GetMonthlyTransactionsVariables): QueryPromise<GetMonthlyTransactionsData, GetMonthlyTransactionsVariables>;
export function getMonthlyTransactions(dc: DataConnect, vars: GetMonthlyTransactionsVariables): QueryPromise<GetMonthlyTransactionsData, GetMonthlyTransactionsVariables>;

interface GetMonthlyIncomeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMonthlyIncomeVariables): QueryRef<GetMonthlyIncomeData, GetMonthlyIncomeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMonthlyIncomeVariables): QueryRef<GetMonthlyIncomeData, GetMonthlyIncomeVariables>;
  operationName: string;
}
export const getMonthlyIncomeRef: GetMonthlyIncomeRef;

export function getMonthlyIncome(vars: GetMonthlyIncomeVariables): QueryPromise<GetMonthlyIncomeData, GetMonthlyIncomeVariables>;
export function getMonthlyIncome(dc: DataConnect, vars: GetMonthlyIncomeVariables): QueryPromise<GetMonthlyIncomeData, GetMonthlyIncomeVariables>;

interface GetPendingPaymentsForDayRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetPendingPaymentsForDayVariables): QueryRef<GetPendingPaymentsForDayData, GetPendingPaymentsForDayVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetPendingPaymentsForDayVariables): QueryRef<GetPendingPaymentsForDayData, GetPendingPaymentsForDayVariables>;
  operationName: string;
}
export const getPendingPaymentsForDayRef: GetPendingPaymentsForDayRef;

export function getPendingPaymentsForDay(vars: GetPendingPaymentsForDayVariables): QueryPromise<GetPendingPaymentsForDayData, GetPendingPaymentsForDayVariables>;
export function getPendingPaymentsForDay(dc: DataConnect, vars: GetPendingPaymentsForDayVariables): QueryPromise<GetPendingPaymentsForDayData, GetPendingPaymentsForDayVariables>;

interface GetNotificationPreferencesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetNotificationPreferencesVariables): QueryRef<GetNotificationPreferencesData, GetNotificationPreferencesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetNotificationPreferencesVariables): QueryRef<GetNotificationPreferencesData, GetNotificationPreferencesVariables>;
  operationName: string;
}
export const getNotificationPreferencesRef: GetNotificationPreferencesRef;

export function getNotificationPreferences(vars: GetNotificationPreferencesVariables): QueryPromise<GetNotificationPreferencesData, GetNotificationPreferencesVariables>;
export function getNotificationPreferences(dc: DataConnect, vars: GetNotificationPreferencesVariables): QueryPromise<GetNotificationPreferencesData, GetNotificationPreferencesVariables>;

interface GetActivePushSubscriptionsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetActivePushSubscriptionsVariables): QueryRef<GetActivePushSubscriptionsData, GetActivePushSubscriptionsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetActivePushSubscriptionsVariables): QueryRef<GetActivePushSubscriptionsData, GetActivePushSubscriptionsVariables>;
  operationName: string;
}
export const getActivePushSubscriptionsRef: GetActivePushSubscriptionsRef;

export function getActivePushSubscriptions(vars: GetActivePushSubscriptionsVariables): QueryPromise<GetActivePushSubscriptionsData, GetActivePushSubscriptionsVariables>;
export function getActivePushSubscriptions(dc: DataConnect, vars: GetActivePushSubscriptionsVariables): QueryPromise<GetActivePushSubscriptionsData, GetActivePushSubscriptionsVariables>;

interface GetAllActivePushSubscriptionsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetAllActivePushSubscriptionsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetAllActivePushSubscriptionsData, undefined>;
  operationName: string;
}
export const getAllActivePushSubscriptionsRef: GetAllActivePushSubscriptionsRef;

export function getAllActivePushSubscriptions(): QueryPromise<GetAllActivePushSubscriptionsData, undefined>;
export function getAllActivePushSubscriptions(dc: DataConnect): QueryPromise<GetAllActivePushSubscriptionsData, undefined>;

interface GetMaxPushSubscriptionIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMaxPushSubscriptionIdData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetMaxPushSubscriptionIdData, undefined>;
  operationName: string;
}
export const getMaxPushSubscriptionIdRef: GetMaxPushSubscriptionIdRef;

export function getMaxPushSubscriptionId(): QueryPromise<GetMaxPushSubscriptionIdData, undefined>;
export function getMaxPushSubscriptionId(dc: DataConnect): QueryPromise<GetMaxPushSubscriptionIdData, undefined>;

