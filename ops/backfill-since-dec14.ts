#!/usr/bin/env tsx
/**
 * Backfill Since Dec 14, 2025
 *
 * Fetches and processes financial emails from Dec 14 to present
 *
 * Usage:
 *   cd ops
 *   npx tsx backfill-since-dec14.ts
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { persistTokens } from 'oauth-token-store';

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
  duplicatesSkipped: number;
  startTime: Date;
  errors: string[];
}

const RATE_LIMIT_DELAY_MS = 100; // 100ms between messages.get calls
const START_DATE = '2025/12/14'; // December 14, 2025

class BackfillSinceDec14 {
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
      duplicatesSkipped: 0,
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

    await persistTokens(
      {
        refresh_token: refreshToken,
      },
      { projectId: this.projectId }
    );

    this.oauth2Client.on('tokens', (tokens) => {
      if (!tokens.access_token && !tokens.refresh_token) {
        return;
      }

      persistTokens(
        {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || refreshToken,
          expiry_date: tokens.expiry_date,
        },
        {
          projectId: this.projectId,
          updateSecretManager: Boolean(tokens.refresh_token),
        }
      ).catch((error) => {
        console.error('❌ Failed to persist refreshed tokens:', error);
      });
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    console.log('✓ Gmail client initialized\n');
  }

  private async listMessages(): Promise<string[]> {
    console.log('📬 Fetching message IDs since Dec 14, 2025...\n');

    const query = `label:financial after:${START_DATE}`;
    console.log(`   Query: ${query}\n`);

    const messageIds: string[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 100,
        pageToken,
      });

      if (response.data.messages) {
        messageIds.push(...response.data.messages.map((m: any) => m.id));
      }

      pageToken = response.data.nextPageToken;
    } while (pageToken);

    console.log(`   Found ${messageIds.length} emails\n`);
    this.stats.totalEmails = messageIds.length;
    return messageIds;
  }

  private async getMessage(messageId: string): Promise<GmailMessage> {
    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    return response.data;
  }

  private extractEmailBody(message: GmailMessage): string {
    function decodeBase64(data: string): string {
      return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
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

    let body = '';
    if (message.payload.body?.data) {
      body = decodeBase64(message.payload.body.data);
    }

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

  private async processMessage(messageId: string): Promise<boolean> {
    try {
      console.log(`   Processing: ${messageId}`);

      const message = await this.getMessage(messageId);

      const senderEmail = this.getHeader(message, 'From') || '';
      const senderName = this.extractName(senderEmail);
      const subject = this.getHeader(message, 'Subject') || '';
      const receivedAt = new Date(parseInt(message.internalDate));
      const emailBody = this.extractEmailBody(message);
      const bodyHash = generateEmailBodyHash(emailBody);
      const provider = this.parserRegistry.detectProvider(message, senderEmail, subject);

      console.log(`      Date: ${receivedAt.toISOString()}`);
      console.log(`      From: ${senderEmail}`);
      console.log(`      Subject: ${subject}`);
      console.log(`      Provider: ${provider || 'unknown'}`);

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

      // Parse transaction if provider detected
      if (provider) {
        const result = await this.parserRegistry.parseEmail(emailBody, message, senderEmail, subject);

        if (result) {
          const { transaction } = result;

          let merchantId: number | undefined;
          if (transaction.merchant) {
            merchantId = await this.dbClient.getOrCreateMerchant({
              name: transaction.merchant,
              normalizedName: normalizeMerchantName(transaction.merchant),
            });
          }

          const idempotencyKey = generateIdempotencyKey(
            emailId,
            transaction.date,
            transaction.amount,
            transaction.merchant
          );

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
            this.stats.transactionsSaved++;
            console.log(`      ✓ Transaction saved: ${transaction.merchant} - $${transaction.amount} ${transaction.currency}`);
          } else {
            this.stats.duplicatesSkipped++;
            console.log(`      ⊘ Duplicate transaction (skipped)`);
          }
        } else {
          console.log(`      ⊘ Failed to parse transaction`);
        }
      } else {
        console.log(`      ⊘ No provider detected`);
      }

      this.stats.processedEmails++;
      return true;

    } catch (error) {
      console.log(`      ✗ Failed: ${error instanceof Error ? error.message : String(error)}`);
      this.stats.failedEmails++;
      this.stats.errors.push(`${messageId}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private printStats(): void {
    const duration = (Date.now() - this.stats.startTime.getTime()) / 1000;

    console.log('\n' + '='.repeat(60));
    console.log('📊 BACKFILL STATISTICS');
    console.log('='.repeat(60));
    console.log(`Period:                   Since Dec 14, 2025`);
    console.log(`Total Emails Found:       ${this.stats.totalEmails}`);
    console.log(`Successfully Processed:   ${this.stats.processedEmails}`);
    console.log(`Transactions Saved:       ${this.stats.transactionsSaved}`);
    console.log(`Duplicates Skipped:       ${this.stats.duplicatesSkipped}`);
    console.log(`Failed:                   ${this.stats.failedEmails}`);
    console.log(`Duration:                 ${duration.toFixed(2)}s`);
    console.log('='.repeat(60) + '\n');

    if (this.stats.errors.length > 0) {
      console.log('❌ Errors:\n');
      this.stats.errors.forEach(error => console.log(`   - ${error}`));
      console.log('');
    }
  }

  async run(): Promise<void> {
    console.log('\n🚀 Starting Backfill Since Dec 14, 2025\n');
    console.log(`   Period: ${START_DATE} to present`);
    console.log(`   Project: ${this.projectId}\n`);

    try {
      await this.initializeGmail();

      const messageIds = await this.listMessages();

      if (messageIds.length === 0) {
        console.log('No emails found in the specified date range.\n');
        return;
      }

      console.log('📝 Processing emails...\n');

      for (let i = 0; i < messageIds.length; i++) {
        const messageId = messageIds[i];
        console.log(`\n[${i + 1}/${messageIds.length}]`);

        await this.processMessage(messageId);

        // Rate limiting
        if (i < messageIds.length - 1) {
          await this.delay(RATE_LIMIT_DELAY_MS);
        }
      }

      this.printStats();

      console.log('✅ Backfill complete!\n');

    } catch (error) {
      console.error('❌ Fatal error:', error);
      this.printStats();
      throw error;
    } finally {
      await this.dbClient.close();
    }
  }
}

// Main execution
const backfill = new BackfillSinceDec14();
backfill.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
