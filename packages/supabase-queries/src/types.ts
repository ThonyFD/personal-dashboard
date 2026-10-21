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

export type DayBlock = 'MORNING' | 'AFTERNOON' | 'EVENING';
export type FrequencyType = 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
export type HabitStatus = 'COMPLETED' | 'SKIPPED' | 'PARTIAL';

export interface HabitTemplate {
  id: number;
  name: string;
  category: string;
  defaultDurationMinutes: number;
  iconIdentifier: string | null;
  colorHex: string | null;
}

export interface UserHabit {
  id: number;
  templateId: number | null;
  name: string;
  iconIdentifier: string | null;
  colorHex: string | null;
  dayBlock: DayBlock;
  frequencyType: FrequencyType;
  customDaysMask: number;
  targetCompletionsPerPeriod: number;
  targetDurationMinutes: number;
  sortOrder: number;
  isActive: boolean;
}

export interface HabitLog {
  id: number;
  userHabitId: number;
  logDate: string;
  status: HabitStatus;
  actualDurationMinutes: number;
}

export interface MoodTag {
  id: number;
  name: string;
  category: string | null;
}

export interface MoodLog {
  id: number;
  logDate: string;
  moodScore: number;
  journalText: string | null;
  tagIds: number[];
}

export interface HabitDayCompletion {
  logDate: string;
  completedCount: number;
  loggedCount: number;
}
