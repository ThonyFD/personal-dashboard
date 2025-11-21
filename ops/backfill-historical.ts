#!/usr/bin/env tsx
/**
 * Historical Email Backfill Script
 *
 * Fetches financial emails from the last 2 years and processes them
 * using the existing ingestion pipeline.
 *
 * Usage:
 *   npm install (if not done)
 *   tsx ops/backfill-historical.ts
 *
 * Features:
 * - Fetches emails with label 'financial' from last 2 years
 * - Uses existing parsing and DB logic from ingestor service
 * - Checkpoint system to resume if interrupted
 * - Respects Gmail API quotas with rate limiting
 * - Progress tracking and statistics
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import * as fs from 'fs';
import * as path from 'path';

// Import from ingestor service
import { DatabaseClient } from '../services/ingestor/src/database/client';
import { ParserRegistry } from '../services/ingestor/src/parsers';
import { Logger } from '../services/ingestor/src/utils/logger';
import { generateEmailBodyHash, generateIdempotencyKey, normalizeMerchantName } from '../services/ingestor/src/utils/hash';
import { EmailData, TransactionData, GmailMessage } from '../services/ingestor/src/types';

interface BackfillCheckpoint {
  lastProcessedMessageId: string | null;
  totalProcessed: number;
  totalFailed: number;
  startedAt: string;
  lastUpdatedAt: string;
}

interface BackfillStats {
  totalEmails: number;
  processedEmails: number;
  failedEmails: number;
  skippedEmails: number;
  startTime: Date;
  errors: string[];
}

const CHECKPOINT_FILE = path.join(__dirname, '.backfill-checkpoint.json');
const BATCH_SIZE = 100; // Gmail API max pageSize is 500, but we'll use 100 for better checkpointing
const RATE_LIMIT_DELAY_MS = 100; // 100ms between messages.get calls = 10 requests/sec (conservative)
const LOOKBACK_YEARS = 2;

class HistoricalBackfill {
  private oauth2Client: OAuth2Client;
  private gmail: any;
  private dbClient: DatabaseClient;
  private parserRegistry: ParserRegistry;
  private secretClient: SecretManagerServiceClient;
  private projectId: string;
  private stats: BackfillStats;
  private checkpoint: BackfillCheckpoint;

  constructor() {
    this.oauth2Client = new OAuth2Client();
    this.dbClient = new DatabaseClient();
    this.parserRegistry = new ParserRegistry();
    this.secretClient = new SecretManagerServiceClient();
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802';
    this.stats = {
      totalEmails: 0,
      processedEmails: 0,
      failedEmails: 0,
      skippedEmails: 0,
      startTime: new Date(),
      errors: [],
    };
    this.checkpoint = this.loadCheckpoint();
  }

  private loadCheckpoint(): BackfillCheckpoint {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      const data = fs.readFileSync(CHECKPOINT_FILE, 'utf-8');
      const checkpoint = JSON.parse(data);
      console.log('\n📍 Checkpoint found - resuming from previous run');
      console.log(`   Last processed: ${checkpoint.lastProcessedMessageId || 'none'}`);
      console.log(`   Already processed: ${checkpoint.totalProcessed} emails\n`);
      return checkpoint;
    }

    return {
      lastProcessedMessageId: null,
      totalProcessed: 0,
      totalFailed: 0,
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  private saveCheckpoint(): void {
    this.checkpoint.lastUpdatedAt = new Date().toISOString();
    this.checkpoint.totalProcessed = this.stats.processedEmails;
    this.checkpoint.totalFailed = this.stats.failedEmails;
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(this.checkpoint, null, 2));
  }

  private async initializeAuth(): Promise<void> {
    console.log('🔐 Initializing OAuth authentication from Secret Manager...\n');

    try {
      // Get OAuth credentials from Secret Manager
      const [clientIdSecret] = await this.secretClient.accessSecretVersion({
        name: `projects/${this.projectId}/secrets/gmail-oauth-client-id/versions/latest`,
      });

      const [clientSecretSecret] = await this.secretClient.accessSecretVersion({
        name: `projects/${this.projectId}/secrets/gmail-oauth-client-secret/versions/latest`,
      });

      const [refreshTokenSecret] = await this.secretClient.accessSecretVersion({
        name: `projects/${this.projectId}/secrets/gmail-oauth-refresh-token/versions/latest`,
      });

      const clientId = clientIdSecret.payload?.data?.toString() || '';
      const clientSecret = clientSecretSecret.payload?.data?.toString() || '';
      const refreshToken = refreshTokenSecret.payload?.data?.toString() || '';

      if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('Missing OAuth credentials in Secret Manager');
      }

      console.log('   ✓ Retrieved OAuth credentials from Secret Manager');

      // Create OAuth2 client with credentials
      this.oauth2Client = new OAuth2Client(clientId, clientSecret);

      // Set refresh token
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      console.log('   ✓ OAuth2 client configured');

      // Refresh to get an access token
      console.log('   ✓ Refreshing access token...');
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);

      console.log('   ✓ Access token refreshed');

      // Initialize Gmail API client
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      console.log('\n✅ Authentication successful\n');

    } catch (error) {
      console.error('\n❌ Authentication failed!');
      console.error('\nError:', error instanceof Error ? error.message : String(error));
      console.error('\nPlease ensure:');
      console.error('1. You are authenticated with gcloud:');
      console.error('   ~/google-cloud-sdk/bin/gcloud auth application-default login');
      console.error('\n2. OAuth secrets exist in Secret Manager:');
      console.error('   - gmail-oauth-client-id');
      console.error('   - gmail-oauth-client-secret');
      console.error('   - gmail-oauth-refresh-token');
      console.error('\n3. You have permission to access secrets in project:', this.projectId);
      throw error;
    }
  }

  private async initializeHandler(): Promise<void> {
    console.log('🔧 Initializing database client and parser...\n');
    // DB client and parser don't need async initialization
    console.log('✅ Handler ready\n');
  }

  private getDateQuery(): string {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - LOOKBACK_YEARS);

    // Format as YYYY/MM/DD for Gmail query
    const year = startDate.getFullYear();
    const month = String(startDate.getMonth() + 1).padStart(2, '0');
    const day = String(startDate.getDate()).padStart(2, '0');

    return `after:${year}/${month}/${day}`;
  }

  private async listMessages(): Promise<string[]> {
    console.log('📬 Fetching message IDs from Gmail...\n');

    const query = `label:financial ${this.getDateQuery()}`;
    console.log(`   Query: ${query}\n`);

    const messageIds: string[] = [];
    let pageToken: string | undefined = undefined;
    let pageCount = 0;

    do {
      try {
        const response = await this.gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: BATCH_SIZE,
          pageToken,
        });

        const messages = response.data.messages || [];
        messageIds.push(...messages.map((m: any) => m.id));

        pageCount++;
        console.log(`   Fetched page ${pageCount}: ${messages.length} messages (total: ${messageIds.length})`);

        pageToken = response.data.nextPageToken;

        // Small delay to be gentle with API
        if (pageToken) {
          await this.sleep(200);
        }
      } catch (error) {
        console.error(`\n❌ Failed to fetch message list: ${error}`);
        throw error;
      }
    } while (pageToken);

    console.log(`\n✅ Found ${messageIds.length} financial emails\n`);
    this.stats.totalEmails = messageIds.length;

    return messageIds;
  }

  private async processMessages(messageIds: string[]): Promise<void> {
    console.log('🚀 Starting message processing...\n');
    console.log(`   Total to process: ${messageIds.length}`);
    console.log(`   Rate limit: ~${Math.floor(1000 / RATE_LIMIT_DELAY_MS)} messages/sec`);
    console.log(`   Estimated time: ~${Math.ceil(messageIds.length * RATE_LIMIT_DELAY_MS / 1000 / 60)} minutes\n`);

    let skipUntilFound = !!this.checkpoint.lastProcessedMessageId;
    let foundCheckpoint = false;

    for (let i = 0; i < messageIds.length; i++) {
      const messageId = messageIds[i];

      // Skip until we find the checkpoint
      if (skipUntilFound) {
        if (messageId === this.checkpoint.lastProcessedMessageId) {
          foundCheckpoint = true;
          skipUntilFound = false;
          console.log(`\n📍 Checkpoint found at message ${i + 1}/${messageIds.length}\n`);
        } else {
          this.stats.skippedEmails++;
          continue;
        }
      }

      try {
        // Process the message using local logic
        await this.processMessage(messageId);

        this.stats.processedEmails++;
        this.checkpoint.lastProcessedMessageId = messageId;

        // Progress update every 10 messages
        if (this.stats.processedEmails % 10 === 0) {
          this.printProgress(i + 1, messageIds.length);
          this.saveCheckpoint();
        }

      } catch (error) {
        this.stats.failedEmails++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.stats.errors.push(`Message ${messageId}: ${errorMsg}`);

        Logger.error('Failed to process message in backfill', {
          event: 'backfill_message_failed',
          messageId,
          error: errorMsg,
        });

        // Continue processing despite errors
        console.error(`   ❌ Failed message ${messageId}: ${errorMsg}`);
      }

      // Rate limiting
      await this.sleep(RATE_LIMIT_DELAY_MS);
    }

    // Final checkpoint save
    this.saveCheckpoint();
  }

  private async processMessage(messageId: string): Promise<void> {
    const timer = Logger.startTimer();

    try {
      Logger.info('Processing message', {
        event: 'message_processing',
        messageId,
      });

      // Fetch full message
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message: GmailMessage = response.data;

      // Extract headers
      const senderEmail = this.getHeader(message, 'From') || '';
      const senderName = this.extractName(senderEmail);
      const subject = this.getHeader(message, 'Subject') || '';
      const receivedAt = new Date(parseInt(message.internalDate));

      // Extract and hash body
      const emailBody = this.extractEmailBody(message);
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
    message: GmailMessage,
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
      // Don't throw - we still want to continue processing
    }
  }

  private extractEmailBody(message: GmailMessage): string {
    // Extract plain text body from Gmail message
    let body = '';

    function decodeBase64(data: string): string {
      return Buffer.from(data, 'base64').toString('utf-8');
    }

    function extractFromPart(part: any): string {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64(part.body.data);
      }

      if (part.parts) {
        for (const subPart of part.parts) {
          const text = extractFromPart(subPart);
          if (text) return text;
        }
      }

      return '';
    }

    // Check main body
    if (message.payload.body?.data) {
      body = decodeBase64(message.payload.body.data);
    }

    // Check parts
    if (!body && message.payload.parts) {
      for (const part of message.payload.parts) {
        body = extractFromPart(part);
        if (body) break;
      }
    }

    return body || message.snippet || '';
  }

  private getHeader(message: GmailMessage, headerName: string): string | undefined {
    const header = message.payload.headers.find(
      (h) => h.name.toLowerCase() === headerName.toLowerCase()
    );
    return header?.value;
  }

  private extractEmail(fromHeader: string): string {
    const match = fromHeader.match(/<(.+?)>/);
    return match ? match[1] : fromHeader;
  }

  private extractName(fromHeader: string): string | undefined {
    const match = fromHeader.match(/^(.+?)\s*</);
    return match ? match[1].replace(/"/g, '').trim() : undefined;
  }

  private printProgress(current: number, total: number): void {
    const percent = Math.floor((current / total) * 100);
    const elapsed = Date.now() - this.stats.startTime.getTime();
    const rate = this.stats.processedEmails / (elapsed / 1000);
    const remaining = total - current;
    const eta = remaining / rate;

    console.log(`\n📊 Progress: ${current}/${total} (${percent}%)`);
    console.log(`   Processed: ${this.stats.processedEmails} | Failed: ${this.stats.failedEmails} | Skipped: ${this.stats.skippedEmails}`);
    console.log(`   Rate: ${rate.toFixed(2)} msg/sec`);
    console.log(`   ETA: ${this.formatDuration(eta)}\n`);
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private printFinalStats(): void {
    const duration = Date.now() - this.stats.startTime.getTime();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Backfill Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`📧 Total emails found: ${this.stats.totalEmails}`);
    console.log(`✅ Successfully processed: ${this.stats.processedEmails}`);
    console.log(`❌ Failed: ${this.stats.failedEmails}`);
    console.log(`⏭️  Skipped (from checkpoint): ${this.stats.skippedEmails}`);
    console.log(`⏱️  Total time: ${this.formatDuration(duration / 1000)}`);
    console.log(`📈 Average rate: ${(this.stats.processedEmails / (duration / 1000)).toFixed(2)} msg/sec\n`);

    if (this.stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered (${this.stats.errors.length}):`);
      this.stats.errors.slice(0, 10).forEach(err => {
        console.log(`   - ${err}`);
      });
      if (this.stats.errors.length > 10) {
        console.log(`   ... and ${this.stats.errors.length - 10} more`);
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  async run(): Promise<void> {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  Historical Email Backfill');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Initialize
      await this.initializeAuth();
      await this.initializeHandler();

      // Fetch message IDs
      const messageIds = await this.listMessages();

      if (messageIds.length === 0) {
        console.log('✨ No messages to process. Exiting.\n');
        return;
      }

      // Process messages
      await this.processMessages(messageIds);

      // Print final stats
      this.printFinalStats();

      // Clean up
      await this.dbClient.close();

      // Delete checkpoint on success
      if (this.stats.failedEmails === 0 && fs.existsSync(CHECKPOINT_FILE)) {
        fs.unlinkSync(CHECKPOINT_FILE);
        console.log('🗑️  Checkpoint file deleted (backfill complete)\n');
      }

    } catch (error) {
      console.error('\n❌ Fatal error:', error);

      // Save checkpoint before exit
      this.saveCheckpoint();
      console.log('\n💾 Checkpoint saved. Run the script again to resume.\n');

      process.exit(1);
    }
  }
}

// Main execution
const backfill = new HistoricalBackfill();
backfill.run().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
