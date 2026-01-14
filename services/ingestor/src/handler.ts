// Main ingestion handler for Gmail push notifications
import { GmailClient } from './gmail/client.js';
import { DatabaseClient } from './database/client.js';
import { ParserRegistry } from './parsers/index.js';
import { Logger } from './utils/logger.js';
import { generateEmailBodyHash, generateIdempotencyKey, simpleNormalizeMerchantName } from './utils/hash.js';
import { autoCategorizeMerchantId } from './utils/category-mapping.js';
import { GmailNotification, EmailData, TransactionData } from './types.js';

export class IngestionHandler {
  private gmailClient: GmailClient;
  private dbClient: DatabaseClient;
  private parserRegistry: ParserRegistry;

  constructor() {
    this.gmailClient = new GmailClient();
    this.dbClient = new DatabaseClient();
    this.parserRegistry = new ParserRegistry();
  }

  async initialize(): Promise<void> {
    await this.gmailClient.initialize();
    Logger.info('Ingestion handler initialized', { event: 'handler_init' });
  }

  async handleNotification(notification: GmailNotification): Promise<void> {
    const timer = Logger.startTimer();
    const { historyId: newHistoryId } = notification;

    try {
      Logger.info('Processing Gmail notification', {
        event: 'notification_received',
        newHistoryId,
      });

      // Get the last processed historyId from database
      const lastHistoryId = await this.dbClient.getLastHistoryId();

      if (!lastHistoryId) {
        Logger.warn('No last historyId found, using notification historyId', {
          event: 'no_last_history_id',
          newHistoryId,
        });
        // First time setup - update the database with current historyId
        await this.dbClient.updateLastHistoryId(newHistoryId);
        return;
      }

      Logger.info('Fetching history from last processed ID', {
        event: 'fetching_history',
        lastHistoryId,
        newHistoryId,
      });

      // Use the LAST processed historyId to get changes up to the new one
      const history = await this.gmailClient.listHistory(lastHistoryId);

      if (!history || history.length === 0) {
        Logger.info('No new messages in history', {
          event: 'no_new_messages',
          lastHistoryId,
          newHistoryId,
        });
        // Update to the new historyId even if no messages
        await this.dbClient.updateLastHistoryId(newHistoryId);
        return;
      }

      Logger.info('Processing history records', {
        event: 'processing_history',
        historyRecordCount: history.length,
      });

      // Process each message in history
      let processedCount = 0;
      let failedCount = 0;
      for (const historyRecord of history) {
        if (historyRecord.messagesAdded) {
          for (const { message } of historyRecord.messagesAdded) {
            try {
              await this.processMessage(message.id);
              processedCount++;
            } catch (error) {
              // Log individual message failure but continue processing
              Logger.warn('Failed to process individual message, continuing...', {
                event: 'message_processing_skipped',
                messageId: message.id,
                error: error instanceof Error ? error.message : String(error),
              });
              failedCount++;
            }
          }
        }
      }

      // ALWAYS update the last processed historyId, even if some messages failed
      // This prevents getting stuck in an infinite loop
      await this.dbClient.updateLastHistoryId(newHistoryId);

      Logger.info('Notification processing complete', {
        event: 'notification_processed',
        lastHistoryId,
        newHistoryId,
        processedCount,
        failedCount,
        duration_ms: timer(),
      });
    } catch (error) {
      Logger.error('Failed to process notification', {
        event: 'notification_failed',
        newHistoryId,
        duration_ms: timer(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async processMessage(messageId: string): Promise<void> {
    const timer = Logger.startTimer();

    try {
      Logger.info('Processing message', {
        event: 'message_processing',
        messageId,
      });

      // Fetch full message
      const message = await this.gmailClient.getMessage(messageId);

      // Extract headers
      const senderEmail = this.gmailClient.getHeader(message, 'From') || '';
      const senderName = this.extractName(senderEmail);
      const subject = this.gmailClient.getHeader(message, 'Subject') || '';
      const receivedAt = new Date(parseInt(message.internalDate));

      // Extract and hash body
      const emailBody = this.gmailClient.extractEmailBody(message);
      const bodyHash = generateEmailBodyHash(emailBody);

      // Detect provider
      const provider = this.parserRegistry.detectProvider(message, senderEmail, subject);

      // Store email
      const emailData: EmailData = {
        gmailMessageId: message.id,
        gmailHistoryId: message.historyId,
        senderEmail: this.extractEmail(senderEmail),
        senderName,
        subject,
        receivedAt,
        bodyHash,
        labels: message.labelIds || [],
        provider,
      };

      const emailId = await this.dbClient.insertEmail(emailData);

      Logger.info('Email stored', {
        event: 'email_stored',
        messageId,
        emailId,
        provider,
      });

      // Parse transaction if provider detected
      if (provider) {
        await this.parseAndStoreTransaction(emailId, emailBody, message, senderEmail, subject);
      }

      Logger.info('Message processing complete', {
        event: 'message_processed',
        messageId,
        emailId,
        duration_ms: timer(),
      });
    } catch (error) {
      Logger.error('Failed to process message', {
        event: 'message_failed',
        messageId,
        duration_ms: timer(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async parseAndStoreTransaction(
    emailId: number,
    emailBody: string,
    message: any,
    senderEmail: string,
    subject: string
  ): Promise<void> {
    const timer = Logger.startTimer();

    try {
      const result = await this.parserRegistry.parseEmail(emailBody, message, senderEmail, subject);

      if (!result) {
        Logger.warn('Failed to parse transaction', {
          event: 'parse_failed',
          emailId,
        });
        return;
      }

      const { provider, transaction } = result;

      // Get or create merchant
      let merchantId: number | undefined;
      if (transaction.merchant) {
        // Auto-categorize merchant based on name
        const categoryId = autoCategorizeMerchantId(transaction.merchant);

        merchantId = await this.dbClient.getOrCreateMerchant({
          name: transaction.merchant,
          normalizedName: simpleNormalizeMerchantName(transaction.merchant),
          categoryId,
        });
      }

      // Generate idempotency key
      const idempotencyKey = generateIdempotencyKey(
        emailId,
        transaction.date,
        transaction.amount,
        transaction.merchant
      );

      // Store transaction
      const txnData: TransactionData = {
        emailId,
        merchantId,
        txnType: transaction.type,
        channel: transaction.channel,
        amount: transaction.amount,
        currency: transaction.currency,
        merchantName: transaction.merchant,
        merchantRaw: transaction.merchant,
        txnDate: transaction.date,
        txnTimestamp: transaction.timestamp,
        cardLast4: transaction.cardLast4,
        accountLast4: transaction.accountLast4,
        provider,
        referenceNumber: transaction.referenceNumber,
        description: transaction.description,
        notes: undefined,
        idempotencyKey,
      };

      const txnId = await this.dbClient.insertTransaction(txnData);

      if (txnId !== -1) {
        await this.dbClient.markEmailParsed(emailId);

        Logger.info('Transaction stored', {
          event: 'transaction_stored',
          emailId,
          transactionId: txnId,
          provider,
          amount: transaction.amount,
          duration_ms: timer(),
        });
      }
    } catch (error) {
      Logger.error('Failed to parse and store transaction', {
        event: 'transaction_storage_failed',
        emailId,
        duration_ms: timer(),
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - we still want to acknowledge the message
    }
  }

  private extractEmail(fromHeader: string): string {
    const match = fromHeader.match(/<(.+?)>/);
    return match ? match[1] : fromHeader;
  }

  private extractName(fromHeader: string): string | undefined {
    const match = fromHeader.match(/^(.+?)\s*</);
    return match ? match[1].replace(/"/g, '').trim() : undefined;
  }

  async close(): Promise<void> {
    await this.dbClient.close();
  }
}
