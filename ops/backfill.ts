#!/usr/bin/env tsx
// Backfill tool for processing historical Gmail messages
// Usage: tsx backfill.ts [--days=30] [--label=financial] [--dry-run]

import { GmailClient } from '../services/ingestor/src/gmail/client';
import { DatabaseClient } from '../services/ingestor/src/database/client';
import { ParserRegistry } from '../services/ingestor/src/parsers';
import { Logger } from '../services/ingestor/src/utils/logger';
import {
  generateEmailBodyHash,
  generateIdempotencyKey,
  normalizeMerchantName,
} from '../services/ingestor/src/utils/hash';
import { EmailData, TransactionData } from '../services/ingestor/src/types';

interface BackfillOptions {
  days: number;
  label?: string;
  dryRun: boolean;
  maxMessages?: number;
}

class BackfillTool {
  private gmailClient: GmailClient;
  private dbClient: DatabaseClient;
  private parserRegistry: ParserRegistry;
  private stats = {
    processed: 0,
    emails: 0,
    transactions: 0,
    errors: 0,
    skipped: 0,
  };

  constructor() {
    this.gmailClient = new GmailClient();
    this.dbClient = new DatabaseClient();
    this.parserRegistry = new ParserRegistry();
  }

  async initialize(): Promise<void> {
    await this.gmailClient.initialize();
    Logger.info('Backfill tool initialized', { event: 'backfill_init' });
  }

  async run(options: BackfillOptions): Promise<void> {
    const startTime = Date.now();

    Logger.info('Starting backfill', {
      event: 'backfill_start',
      options,
    });

    try {
      // Calculate date range
      const afterDate = new Date();
      afterDate.setDate(afterDate.getDate() - options.days);
      const afterTimestamp = Math.floor(afterDate.getTime() / 1000);

      // Build query
      let query = `after:${afterTimestamp}`;
      if (options.label) {
        query += ` label:${options.label}`;
      }

      Logger.info('Fetching messages', {
        event: 'backfill_fetch',
        query,
      });

      // List messages
      const messages = await this.listMessages(query, options.maxMessages);

      Logger.info(`Found ${messages.length} messages to process`, {
        event: 'backfill_messages_found',
        count: messages.length,
      });

      // Process messages in batches
      const batchSize = 10;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        await this.processBatch(batch, options.dryRun);

        Logger.info(`Progress: ${Math.min(i + batchSize, messages.length)}/${messages.length}`, {
          event: 'backfill_progress',
          progress: Math.round((Math.min(i + batchSize, messages.length) / messages.length) * 100),
        });
      }

      const duration = Date.now() - startTime;

      Logger.info('Backfill complete', {
        event: 'backfill_complete',
        duration_ms: duration,
        stats: this.stats,
      });

      this.printSummary(duration);
    } catch (error) {
      Logger.error('Backfill failed', {
        event: 'backfill_failed',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async listMessages(query: string, maxMessages?: number): Promise<string[]> {
    const gmail = (this.gmailClient as any).gmail;
    const messageIds: string[] = [];
    let pageToken: string | undefined;

    do {
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: Math.min(maxMessages ? maxMessages - messageIds.length : 500, 500),
        pageToken,
      });

      if (response.data.messages) {
        messageIds.push(...response.data.messages.map((m: any) => m.id));
      }

      pageToken = response.data.nextPageToken;

      if (maxMessages && messageIds.length >= maxMessages) {
        break;
      }
    } while (pageToken);

    return messageIds;
  }

  private async processBatch(messageIds: string[], dryRun: boolean): Promise<void> {
    await Promise.all(messageIds.map((id) => this.processMessage(id, dryRun)));
  }

  private async processMessage(messageId: string, dryRun: boolean): Promise<void> {
    try {
      this.stats.processed++;

      // Fetch message
      const message = await this.gmailClient.getMessage(messageId);

      // Extract headers
      const senderEmail = this.extractEmail(
        this.gmailClient.getHeader(message, 'From') || ''
      );
      const senderName = this.extractName(
        this.gmailClient.getHeader(message, 'From') || ''
      );
      const subject = this.gmailClient.getHeader(message, 'Subject') || '';
      const receivedAt = new Date(parseInt(message.internalDate));

      // Extract and hash body
      const emailBody = this.gmailClient.extractEmailBody(message);
      const bodyHash = generateEmailBodyHash(emailBody);

      // Detect provider
      const provider = this.parserRegistry.detectProvider(message, senderEmail, subject);

      if (dryRun) {
        Logger.info('DRY RUN - Would process email', {
          event: 'backfill_dry_run',
          messageId,
          sender: senderEmail,
          subject,
          provider,
        });
        if (provider) {
          this.stats.emails++;
        }
        return;
      }

      // Store email
      const emailData: EmailData = {
        gmailMessageId: message.id,
        gmailHistoryId: message.historyId,
        senderEmail,
        senderName,
        subject,
        receivedAt,
        bodyHash,
        labels: message.labelIds || [],
        provider,
      };

      const emailId = await this.dbClient.insertEmail(emailData);
      this.stats.emails++;

      // Parse transaction if provider detected
      if (provider) {
        const result = await this.parserRegistry.parseEmail(
          emailBody,
          message,
          senderEmail,
          subject
        );

        if (result) {
          const { transaction } = result;

          // Get or create merchant
          let merchantId: number | undefined;
          if (transaction.merchant) {
            merchantId = await this.dbClient.getOrCreateMerchant({
              name: transaction.merchant,
              normalizedName: normalizeMerchantName(transaction.merchant),
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
            provider: result.provider,
            referenceNumber: transaction.referenceNumber,
            description: transaction.description,
            notes: undefined,
            idempotencyKey,
          };

          const txnId = await this.dbClient.insertTransaction(txnData);

          if (txnId !== -1) {
            await this.dbClient.markEmailParsed(emailId);
            this.stats.transactions++;
          } else {
            this.stats.skipped++; // Duplicate transaction
          }
        }
      }
    } catch (error) {
      this.stats.errors++;
      Logger.error('Failed to process message in backfill', {
        event: 'backfill_message_failed',
        messageId,
        error: error instanceof Error ? error.message : String(error),
      });
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

  private printSummary(durationMs: number): void {
    console.log('\n========================================');
    console.log('BACKFILL SUMMARY');
    console.log('========================================');
    console.log(`Duration: ${(durationMs / 1000).toFixed(2)}s`);
    console.log(`Messages processed: ${this.stats.processed}`);
    console.log(`Emails stored: ${this.stats.emails}`);
    console.log(`Transactions created: ${this.stats.transactions}`);
    console.log(`Duplicates skipped: ${this.stats.skipped}`);
    console.log(`Errors: ${this.stats.errors}`);
    console.log('========================================\n');
  }

  async close(): Promise<void> {
    await this.dbClient.close();
  }
}

// Parse command line arguments
function parseArgs(): BackfillOptions {
  const args = process.argv.slice(2);
  const options: BackfillOptions = {
    days: 30,
    dryRun: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--days=')) {
      options.days = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--label=')) {
      options.label = arg.split('=')[1];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--max=')) {
      options.maxMessages = parseInt(arg.split('=')[1], 10);
    }
  }

  return options;
}

// Main execution
async function main() {
  const options = parseArgs();

  console.log('AI Finance Agent - Backfill Tool');
  console.log('=================================\n');
  console.log('Options:', options);
  console.log('');

  const tool = new BackfillTool();

  try {
    await tool.initialize();
    await tool.run(options);
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  } finally {
    await tool.close();
  }
}

main();
