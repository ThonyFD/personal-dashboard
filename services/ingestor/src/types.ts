// Type definitions for AI Finance Agent Ingestor

export type TxnType = 'purchase' | 'payment' | 'refund' | 'withdrawal' | 'transfer' | 'fee' | 'income' | 'other';
export type ChannelType = 'card' | 'bank_transfer' | 'cash' | 'mobile_payment' | 'other';

export interface EmailData {
  gmailMessageId: string;
  gmailHistoryId?: string;
  senderEmail: string;
  senderName?: string;
  subject: string;
  receivedAt: Date;
  bodyHash: string;
  labels: string[];
  provider?: string;
}

export interface MerchantData {
  name: string;
  normalizedName: string;
  categoryId?: number;
}

export interface TransactionData {
  emailId: number;
  merchantId?: number;
  txnType: TxnType;
  channel: ChannelType;
  amount: number;
  currency: string;
  merchantName?: string;
  merchantRaw?: string;
  txnDate: Date;
  txnTimestamp?: Date;
  cardLast4?: string;
  accountLast4?: string;
  provider: string;
  referenceNumber?: string;
  description?: string;
  notes?: string;
  idempotencyKey: string;
}

export interface ParsedTransaction {
  type: TxnType;
  channel: ChannelType;
  amount: number;
  currency: string;
  merchant: string;
  date: Date;
  timestamp?: Date;
  cardLast4?: string;
  accountLast4?: string;
  referenceNumber?: string;
  description?: string;
}

export interface GmailMessage {
  id: string;
  historyId?: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string };
      parts?: any[];
    }>;
  };
  internalDate: string;
}

export interface PubSubMessage {
  message: {
    data: string;
    attributes?: { [key: string]: string };
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

export interface GmailNotification {
  emailAddress: string;
  historyId: string;
}

export interface LogContext {
  event: string;
  provider?: string;
  stage?: string;
  duration_ms?: number;
  error?: string;
  messageId?: string;
  emailId?: number;
  [key: string]: any;
}
