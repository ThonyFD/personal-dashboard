#!/usr/bin/env tsx
/**
 * Banistmo Email Reprocessing Script
 *
 * Fetches and reprocesses ALL Banistmo financial emails with updated parser
 * Idempotency keys prevent duplicates
 *
 * Usage:
 *   cd ops
 *   npx tsx backfill-banistmo.ts
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Import from ingestor service
import { DatabaseClient } from '../services/ingestor/src/database/client';
import { ParserRegistry } from '../services/ingestor/src/parsers';
import { generateEmailBodyHash, generateIdempotencyKey, normalizeMerchantName } from '../services/ingestor/src/utils/hash';
import { EmailData, TransactionData, GmailMessage } from '../services/ingestor/src/types';

interface Stats {
  totalEmails: number;
  processedEmails: number;
  failedEmails: number;
  transactionsSaved: number;
  startTime: Date;
  errors: string[];
}

const RATE_LIMIT_DELAY_MS = 100; // 100ms between messages.get calls

class BanistmoBackfill {
  private oauth2Client: OAuth2Client;
  private gmail: any;
  private dbClient: DatabaseClient;
  private parserRegistry: ParserRegistry;
  private secretClient: SecretManagerServiceClient;
  private projectId: string;
  private stats: Stats;

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
      transactionsSaved: 0,
      startTime: new Date(),
      errors: [],
    };
  }

  private async getSecret(secretName: string): Promise<string> {
    const name = `projects/${this.projectId}/secrets/${secretName}/versions/latest`;
    const [version] = await this.secretClient.accessSecretVersion({ name });
    return version.payload?.data?.toString() || '';
  }

  private async initializeGmail(): Promise<void> {
    console.log('🔐 Fetching OAuth credentials from Secret Manager...');

    const clientId = await this.getSecret('gmail-oauth-client-id');
    const clientSecret = await this.getSecret('gmail-oauth-client-secret');
    const refreshToken = await this.getSecret('gmail-oauth-refresh-token');

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    console.log('✓ Gmail client initialized\n');
  }

  private async listMessages(): Promise<string[]> {
    console.log('📬 Fetching Banistmo message IDs...\n');

    const query = `from:notificaciones@banistmo.com label:financial`;
    console.log(`   Query: ${query}\n`);

    const messageIds: string[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 500,
        pageToken,
      });

      const messages = response.data.messages || [];
      messageIds.push(...messages.map((m: any) => m.id));
      pageToken = response.data.nextPageToken;

      console.log(`   Found ${messageIds.length} emails so far...`);
    } while (pageToken);

    this.stats.totalEmails = messageIds.length;
    console.log(`\n✓ Total Banistmo emails: ${messageIds.length}\n`);

    return messageIds;
  }

  private async getMessage(id: string): Promise<GmailMessage> {
    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full',
    });
    return response.data as GmailMessage;
  }

  private extractEmailData(message: GmailMessage): EmailData {
    const headers = message.payload?.headers || [];
    const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
    const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
    const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date')?.value || '';

    // Extract body
    let body = '';
    if (message.payload?.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } else if (message.payload?.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
          break;
        }
      }
    }

    return {
      gmailMessageId: message.id!,
      gmailHistoryId: message.historyId!,
      senderEmail: from.match(/<(.+)>/)?.[1] || from,
      senderName: from.match(/^([^<]+)</)?.[1]?.trim() || from,
      subject,
      receivedAt: new Date(dateHeader || Date.now()),
      bodyHash: generateEmailBodyHash(body),
      labels: message.labelIds || [],
    };
  }

  private async processEmail(message: GmailMessage): Promise<void> {
    const headers = message.payload?.headers || [];
    const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
    const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';

    // Extract body
    let body = '';
    if (message.payload?.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } else if (message.payload?.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
          break;
        }
      }
    }

    // Get email data
    const emailData = this.extractEmailData(message);

    // Save email to database (will skip if duplicate)
    const emailId = await this.dbClient.insertEmail(emailData);

    // Parse transaction
    const transaction = await this.parserRegistry.parse(from, subject, body);

    if (transaction) {
      // Add email reference and idempotency key
      const txnData: TransactionData = {
        ...transaction,
        emailId,
        idempotencyKey: generateIdempotencyKey(emailData.gmailMessageId, transaction),
      };

      // Save transaction (will skip if duplicate via idempotency key)
      const txnId = await this.dbClient.insertTransaction(txnData);
      if (txnId !== -1) {
        this.stats.transactionsSaved++;
      }
    }

    this.stats.processedEmails++;
  }

  async run(): Promise<void> {
    console.log('🔄 Banistmo Transaction Reprocessing');
    console.log('=' + '='.repeat(50) + '\n');

    try {
      // Initialize
      await this.initializeGmail();

      // Get all Banistmo messages
      const messageIds = await this.listMessages();

      if (messageIds.length === 0) {
        console.log('No Banistmo emails found.');
        return;
      }

      // Process each message
      console.log('📝 Processing emails...\n');

      for (let i = 0; i < messageIds.length; i++) {
        const id = messageIds[i];

        try {
          const message = await this.getMessage(id);
          await this.processEmail(message);

          if ((i + 1) % 50 === 0) {
            console.log(`   Progress: ${i + 1}/${messageIds.length} (${this.stats.transactionsSaved} transactions saved)`);
          }

          // Rate limit
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
        } catch (error: any) {
          this.stats.failedEmails++;
          this.stats.errors.push(`${id}: ${error.message}`);
          console.error(`   ❌ Error processing ${id}: ${error.message}`);
        }
      }

      // Final stats
      this.printStats();
    } catch (error: any) {
      console.error('\n❌ Fatal error:', error);
      throw error;
    }
  }

  private printStats(): void {
    const duration = (Date.now() - this.stats.startTime.getTime()) / 1000;

    console.log('\n' + '='.repeat(50));
    console.log('✅ Reprocessing Complete!');
    console.log('='.repeat(50));
    console.log('📊 Stats:');
    console.log(`   Total emails: ${this.stats.totalEmails}`);
    console.log(`   Processed: ${this.stats.processedEmails}`);
    console.log(`   Failed: ${this.stats.failedEmails}`);
    console.log(`   Transactions saved: ${this.stats.transactionsSaved}`);
    console.log(`   Duration: ${duration.toFixed(2)}s`);

    if (this.stats.errors.length > 0) {
      console.log(`\n⚠️  Errors (${this.stats.errors.length}):`);
      this.stats.errors.slice(0, 5).forEach(err => console.log(`   ${err}`));
      if (this.stats.errors.length > 5) {
        console.log(`   ... and ${this.stats.errors.length - 5} more`);
      }
    }
  }
}

// Run the backfill
const backfill = new BanistmoBackfill();
backfill.run().catch(console.error);
