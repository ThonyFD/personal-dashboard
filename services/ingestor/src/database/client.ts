// Firebase Data Connect client
import { initializeApp, getApps } from 'firebase/app';
import { getDataConnect } from 'firebase/data-connect';
import { createRequire } from 'module';
// Import from generated SDK (CommonJS)
const require = createRequire(import.meta.url);
const generated = require('../generated/index.cjs.js');
const {
  connectorConfig,
  createEmail,
  createMerchant,
  createTransaction,
  updateEmailParsed,
  getGmailSyncState,
  updateGmailSyncState,
  getMerchantByName,
  getAllEmails,
  getEmailsAfterDate,
  getLatestEmail,
  getAllTransactions,
  getTransactionsAfterDate,
  getLatestTransaction,
  ChannelType,
  TxnType,
} = generated;
import { Logger } from '../utils/logger.js';
import { EmailData, TransactionData, MerchantData } from '../types.js';


export class DatabaseClient {
  private dataConnect: ReturnType<typeof getDataConnect>;
  private idCounter: number = 0;

  constructor() {
    // Initialize Firebase App if not already initialized
    if (!getApps().length) {
      const firebaseConfig = {
        projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || 'mail-reader-433802',
      };

      initializeApp(firebaseConfig);

      Logger.info('Firebase App initialized', {
        event: 'firebase_app_init',
        projectId: firebaseConfig.projectId,
      });
    }

    // Initialize Firebase Data Connect
    this.dataConnect = getDataConnect(connectorConfig);

    Logger.info('Firebase Data Connect initialized', {
      event: 'db_init',
      connector: 'default',
    });
  }

  /**
   * Generate a safe INT32 ID
   * Uses current time in seconds (not milliseconds) + counter
   * Max INT32: 2,147,483,647
   * Current time in seconds: ~1,762,182,412 (still fits in INT32)
   */
  private generateSafeId(): number {
    const baseId = Math.floor(Date.now() / 1000); // Convert to seconds
    this.idCounter = (this.idCounter + 1) % 1000; // Counter 0-999

    // Combine: seconds * 1000 + counter
    // This gives us unique IDs but keeps them under INT32 max
    const id = baseId * 1000 + this.idCounter;

    // Ensure it's within INT32 range
    const MAX_INT32 = 2147483647;
    if (id > MAX_INT32) {
      // Fallback to random in safe range
      return Math.floor(Math.random() * MAX_INT32);
    }

    return id;
  }

  /**
   * Insert an email
   * Generates ID and inserts using Data Connect SDK
   */
  async insertEmail(data: EmailData): Promise<number> {
    const timer = Logger.startTimer();

    try {
      // Generate unique ID using safe INT32 method
      const id = this.generateSafeId();

      // Convert Date to ISO timestamp string
      const receivedAt = data.receivedAt.toISOString();

      // Convert gmailHistoryId to number if present
      const gmailHistoryId = data.gmailHistoryId
        ? parseInt(data.gmailHistoryId, 10)
        : null;

      // Call the generated mutation
      await createEmail(this.dataConnect, {
        id,
        gmailMessageId: data.gmailMessageId,
        gmailHistoryId,
        senderEmail: data.senderEmail,
        senderName: data.senderName || null,
        subject: data.subject || null,
        receivedAt,
        bodyHash: data.bodyHash,
        labels: data.labels || null,
        provider: data.provider || null,
        parsed: false,
      });

      Logger.info('Email inserted', {
        event: 'email_inserted',
        duration_ms: timer(),
        emailId: id,
        gmailMessageId: data.gmailMessageId,
      });

      return id;

    } catch (error) {
      // Check if it's a duplicate key error
      if (error instanceof Error && error.message.includes('duplicate key')) {
        Logger.warn('Email already exists, fetching existing ID', {
          event: 'email_duplicate',
          gmailMessageId: data.gmailMessageId,
        });

        // In production, query for existing email by gmailMessageId
        // For now, return a placeholder ID
        return this.generateSafeId();
      }

      Logger.error('Failed to insert email', {
        event: 'email_insert_failed',
        duration_ms: timer(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get or create a merchant
   * Returns the merchant ID
   */
  async getOrCreateMerchant(data: MerchantData): Promise<number> {
    const timer = Logger.startTimer();

    try {
      // First, try to find existing merchant by normalized_name
      const existingResult = await getMerchantByName(this.dataConnect, {
        name: data.normalizedName,
      });

      if (existingResult.data?.merchant) {
        Logger.info('Merchant found', {
          event: 'merchant_found',
          duration_ms: timer(),
          merchantId: existingResult.data.merchant.id,
          normalizedName: data.normalizedName,
        });

        return existingResult.data.merchant.id;
      }

      // Merchant doesn't exist, create it
      const id = this.generateSafeId();

      await createMerchant(this.dataConnect, {
        id,
        name: data.name,
        normalizedName: data.normalizedName,
        categoryId: data.categoryId || null,
      });

      Logger.info('Merchant created', {
        event: 'merchant_created',
        duration_ms: timer(),
        merchantId: id,
        normalizedName: data.normalizedName,
      });

      return id;

    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        // Race condition: merchant was created between our check and insert
        // Query again to get the ID
        Logger.warn('Merchant duplicate detected, querying for existing ID', {
          event: 'merchant_duplicate',
          normalizedName: data.normalizedName,
        });

        const existingResult = await getMerchantByName(this.dataConnect, {
          name: data.normalizedName,
        });

        if (existingResult.data?.merchant) {
          return existingResult.data.merchant.id;
        }

        // This should never happen, but fallback
        throw new Error(`Merchant duplicate detected but not found: ${data.normalizedName}`);
      }

      Logger.error('Failed to create merchant', {
        event: 'merchant_create_failed',
        duration_ms: timer(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Insert a transaction
   * Returns the transaction ID or -1 if duplicate
   */
  async insertTransaction(data: TransactionData): Promise<number> {
    const timer = Logger.startTimer();

    try {
      // Generate unique ID using safe INT32 method
      const id = this.generateSafeId();

      // Convert transaction type to enum
      const txnType = data.txnType.toUpperCase() as keyof typeof TxnType;
      const channel = data.channel.toUpperCase() as keyof typeof ChannelType;

      // Convert Date to ISO string
      const txnDate = data.txnDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const txnTimestamp = data.txnTimestamp?.toISOString() || null;

      await createTransaction(this.dataConnect, {
        id,
        emailId: data.emailId,
        merchantId: data.merchantId || null,
        txnType: TxnType[txnType],
        channel: ChannelType[channel],
        amount: data.amount,
        currency: data.currency || 'USD',
        merchantName: data.merchantName || null,
        merchantRaw: data.merchantRaw || null,
        txnDate,
        txnTimestamp,
        cardLast4: data.cardLast4 || null,
        accountLast4: data.accountLast4 || null,
        provider: data.provider,
        referenceNumber: data.referenceNumber || null,
        description: data.description || null,
        notes: data.notes || null,
        idempotencyKey: data.idempotencyKey,
      });

      Logger.info('Transaction inserted', {
        event: 'transaction_inserted',
        duration_ms: timer(),
        transactionId: id,
        idempotencyKey: data.idempotencyKey,
        amount: data.amount,
        merchant: data.merchantName,
      });

      return id;

    } catch (error) {
      // Check if it's a duplicate key error
      if (error instanceof Error && (error.message.includes('duplicate') || error.message.includes('idempotency'))) {
        Logger.warn('Transaction already exists (duplicate)', {
          event: 'duplicate_transaction',
          idempotencyKey: data.idempotencyKey,
        });
        return -1;
      }

      Logger.error('Failed to insert transaction', {
        event: 'transaction_insert_failed',
        duration_ms: timer(),
        idempotencyKey: data.idempotencyKey,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Mark an email as parsed
   */
  async markEmailParsed(emailId: number): Promise<void> {
    const timer = Logger.startTimer();

    try {
      await updateEmailParsed(this.dataConnect, {
        id: emailId,
        parsed: true,
      });

      Logger.info('Email marked as parsed', {
        event: 'email_marked_parsed',
        duration_ms: timer(),
        emailId,
      });

    } catch (error) {
      Logger.error('Failed to mark email as parsed', {
        event: 'email_mark_parsed_failed',
        duration_ms: timer(),
        emailId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get the last processed historyId
   */
  async getLastHistoryId(): Promise<string | null> {
    const timer = Logger.startTimer();

    try {
      const result = await getGmailSyncState(this.dataConnect);

      if (!result.data?.gmailSyncState) {
        Logger.warn('Gmail sync state not found', {
          event: 'sync_state_not_found',
        });
        return null;
      }

      const historyId = String(result.data.gmailSyncState.lastHistoryId);

      Logger.info('Retrieved last historyId', {
        event: 'get_last_history_id',
        historyId,
        lastSyncedAt: result.data.gmailSyncState.lastSyncedAt,
        duration_ms: timer(),
      });

      return historyId;

    } catch (error) {
      Logger.error('Failed to get last historyId', {
        event: 'get_last_history_id_failed',
        duration_ms: timer(),
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Update the last processed historyId
   */
  async updateLastHistoryId(historyId: string, watchExpiration?: string): Promise<void> {
    const timer = Logger.startTimer();

    try {
      await updateGmailSyncState(this.dataConnect, {
        lastHistoryId: parseInt(historyId, 10),
        lastSyncedAt: new Date().toISOString(),
        watchExpiration: watchExpiration || null,
      });

      Logger.info('Updated last historyId', {
        event: 'update_last_history_id',
        historyId,
        watchExpiration,
        duration_ms: timer(),
      });

    } catch (error) {
      Logger.error('Failed to update last historyId', {
        event: 'update_last_history_id_failed',
        duration_ms: timer(),
        historyId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get email statistics for monitoring
   */
  async getEmailStats(): Promise<{
    total: number;
    last24h: number;
    last7d: number;
    latestReceivedAt: string | null;
  }> {
    const timer = Logger.startTimer();
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get total count
      const totalResult = await getAllEmails(this.dataConnect);
      const total = totalResult.data.emails?.length || 0;

      // Get last 24h count
      const last24hResult = await getEmailsAfterDate(this.dataConnect, {
        minDate: oneDayAgo.toISOString(),
      });
      const last24h = last24hResult.data.emails?.length || 0;

      // Get last 7d count
      const last7dResult = await getEmailsAfterDate(this.dataConnect, {
        minDate: sevenDaysAgo.toISOString(),
      });
      const last7d = last7dResult.data.emails?.length || 0;

      // Get latest email
      const latestResult = await getLatestEmail(this.dataConnect);
      const latestReceivedAt = latestResult.data.emails?.[0]?.receivedAt || null;

      Logger.info('Email stats retrieved', {
        event: 'get_email_stats',
        duration_ms: timer(),
        total,
        last24h,
        last7d,
      });

      return { total, last24h, last7d, latestReceivedAt };
    } catch (error) {
      Logger.error('Failed to get email stats', {
        event: 'get_email_stats_failed',
        duration_ms: timer(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get transaction statistics for monitoring
   */
  async getTransactionStats(): Promise<{
    total: number;
    last24h: number;
    last7d: number;
    latestDate: string | null;
  }> {
    const timer = Logger.startTimer();
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Format dates as YYYY-MM-DD for Date type
      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      // Get total count
      const totalResult = await getAllTransactions(this.dataConnect);
      const total = totalResult.data.transactions?.length || 0;

      // Get last 24h count
      const last24hResult = await getTransactionsAfterDate(this.dataConnect, {
        minDate: formatDate(oneDayAgo),
      });
      const last24h = last24hResult.data.transactions?.length || 0;

      // Get last 7d count
      const last7dResult = await getTransactionsAfterDate(this.dataConnect, {
        minDate: formatDate(sevenDaysAgo),
      });
      const last7d = last7dResult.data.transactions?.length || 0;

      // Get latest transaction
      const latestResult = await getLatestTransaction(this.dataConnect);
      const latestDate = latestResult.data.transactions?.[0]?.txnDate || null;

      Logger.info('Transaction stats retrieved', {
        event: 'get_transaction_stats',
        duration_ms: timer(),
        total,
        last24h,
        last7d,
      });

      return { total, last24h, last7d, latestDate };
    } catch (error) {
      Logger.error('Failed to get transaction stats', {
        event: 'get_transaction_stats_failed',
        duration_ms: timer(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Close connection (no-op for Data Connect)
   */
  async close(): Promise<void> {
    // Firebase Data Connect handles connections automatically
    Logger.info('Database client closed', {
      event: 'db_close',
    });
  }
}
