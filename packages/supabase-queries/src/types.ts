export interface CategoryRef {
  id: number;
  name: string;
  icon: string;
  color: string;
}

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
    categoryRef?: CategoryRef;
  };
  email: {
    sender_email: string;
    subject: string | null;
    received_at: string;
  };
}

export interface TransactionFilters {
  searchTerm?: string;
  typeFilter?: string;
  channelFilter?: string;
  providerFilter?: string;
}

export interface PaginatedTransactionsResult {
  transactions: Transaction[];
  totalCount: number;
  totalPages: number;
}

export interface TransactionSummary {
  totalCount: number;
  totalAmount: number;
  topMerchant: string | null;
  topMerchantAmount: number;
  topMerchantCount: number;
}

export interface Merchant {
  id: number;
  name: string;
  categoryId: number | null;
  categoryRef?: CategoryRef;
  transaction_count: number | null;
  total_amount: number | null;
  inDatabase?: boolean;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
}

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

export interface PendingPayment {
  id: number;
  description: string;
  amount: number;
  due_date: string;
  days_ahead: number;
}

export interface PushSubscription {
  id: number;
  user_email: string;
  endpoint: string;
  keys: Record<string, string>;
  is_active: boolean;
}
