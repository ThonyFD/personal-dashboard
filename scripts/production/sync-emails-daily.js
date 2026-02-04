#!/usr/bin/env node
/**
 * Daily Email Sync Script - Production Ready
 *
 * Syncs financial emails from Gmail to the database.
 * Processes emails from the last synced email until now.
 *
 * Features:
 * - Fetches emails since last processed email
 * - Uses existing ingestion pipeline (parsers, DB client)
 * - Idempotent: skips already processed emails
 * - Rate limiting to respect Gmail API quotas
 * - Comprehensive error handling and logging
 * - Auto-updates sync state on success
 *
 * Usage:
 *   cd scripts
 *   node sync-emails-daily.js
 *
 * Environment Variables:
 *   GOOGLE_CLOUD_PROJECT - GCP project ID (default: mail-reader-433802)
 *   LOOKBACK_DAYS - Override lookback period (default: calculated from last email)
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { persistTokens } from 'oauth-token-store';
import { createRequire } from 'node:module';

// Import from ingestor service (compiled dist)
import { DatabaseClient } from '../../services/ingestor/dist/database/client.js';
import { ParserRegistry } from '../../services/ingestor/dist/parsers/index.js';
import {
  generateEmailBodyHash,
  generateIdempotencyKey,
  normalizeMerchantName
} from '../../services/ingestor/dist/utils/hash.js';
import { autoCategorizeMerchantId } from '../../services/ingestor/dist/utils/category-mapping.js';

const require = createRequire(import.meta.url);

// Configuration
const RATE_LIMIT_DELAY_MS = 100; // Conservative rate limiting: 10 req/sec
const MAX_RESULTS_PER_PAGE = 100;
const DEFAULT_LOOKBACK_DAYS = 7; // Fallback if no last email found
const MAX_LOOKBACK_DAYS = 30; // Safety limit

class DailyEmailSync {
  constructor() {
    this.oauth2Client = new OAuth2Client();
    this.dbClient = new DatabaseClient();
    this.parserRegistry = new ParserRegistry();
    this.secretClient = new SecretManagerServiceClient();
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802';
    this.gmail = null;
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

  /**
   * Get secret from Google Secret Manager
   */
  async getSecret(secretName) {
    const name = `projects/${this.projectId}/secrets/${secretName}/versions/latest`;
    const [version] = await this.secretClient.accessSecretVersion({ name });
    return version.payload?.data?.toString() || '';
  }

  /**
   * Initialize Gmail API client with OAuth credentials
   */
  async initializeGmail() {
    console.log('🔐 Fetching OAuth credentials from Secret Manager...');

    const clientId = await this.getSecret('gmail-oauth-client-id');
    const clientSecret = await this.getSecret('gmail-oauth-client-secret');
    const refreshToken = await this.getSecret('gmail-oauth-refresh-token');

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });

    // Persist initial tokens
    await persistTokens(
      { refresh_token: refreshToken },
      { projectId: this.projectId }
    );

    // Auto-refresh token handler
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

  /**
   * Calculate the date query based on last processed email
   * Returns null if we should fetch all emails
   */
  async calculateDateQuery() {
    console.log('📅 Calculating sync window...');

    try {
      // Get the last processed email from database
      const lastEmail = await this.getLastProcessedEmail();

      if (!lastEmail) {
        console.log(`   No previous emails found, using ${DEFAULT_LOOKBACK_DAYS} days lookback\n`);
        return this.formatDateQuery(DEFAULT_LOOKBACK_DAYS);
      }

      const lastEmailDate = new Date(lastEmail.receivedAt);
      const now = new Date();
      const daysSince = Math.ceil((now.getTime() - lastEmailDate.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`   Last email: ${lastEmailDate.toISOString()}`);
      console.log(`   Days since: ${daysSince}`);

      // Safety check: don't go back too far
      if (daysSince > MAX_LOOKBACK_DAYS) {
        console.log(`   ⚠️  Gap exceeds ${MAX_LOOKBACK_DAYS} days, limiting lookback\n`);
        return this.formatDateQuery(MAX_LOOKBACK_DAYS);
      }

      // Add 1 day buffer to ensure we don't miss anything
      const lookbackDays = Math.max(daysSince + 1, DEFAULT_LOOKBACK_DAYS);
      console.log(`   Using ${lookbackDays} days lookback\n`);

      return this.formatDateQuery(lookbackDays);

    } catch (error) {
      console.error('   ⚠️  Error calculating date query, using default:', error);
      return this.formatDateQuery(DEFAULT_LOOKBACK_DAYS);
    }
  }

  /**
   * Format date query for Gmail API
   */
  formatDateQuery(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `after:${year}/${month}/${day}`;
  }

  /**
   * Get the last processed email from database
   */
  async getLastProcessedEmail() {
    try {
      // Use the generated query from Data Connect
      const generated = require('../../services/ingestor/src/generated/index.cjs.js');
      const result = await generated.getLatestEmail(this.dbClient['dataConnect']);

      if (result.data?.emails && result.data.emails.length > 0) {
        return result.data.emails[0];
      }

      return null;
    } catch (error) {
      console.error('Error fetching last email:', error);
      return null;
    }
  }

  /**
   * List message IDs from Gmail matching the query
   */
  async listMessages(dateQuery) {
    console.log('📬 Fetching message IDs from Gmail...');

    const query = dateQuery
      ? `label:financial ${dateQuery}`
      : 'label:financial';

    console.log(`   Query: ${query}\n`);

    const messageIds = [];
    let pageToken = undefined;

    try {
      do {
        const response = await this.gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: MAX_RESULTS_PER_PAGE,
          pageToken,
        });

        if (response.data.messages) {
          messageIds.push(...response.data.messages.map((m) => m.id));
        }

        pageToken = response.data.nextPageToken;
      } while (pageToken);

      console.log(`   Found ${messageIds.length} emails\n`);
      this.stats.totalEmails = messageIds.length;
      return messageIds;

    } catch (error) {
      console.error('❌ Failed to list messages:', error);
      throw error;
    }
  }

  /**
   * Get full message details from Gmail
   */
  async getMessage(messageId) {
    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    return response.data;
  }

  /**
   * Extract email body from Gmail message
   */
  extractEmailBody(message) {
    function decodeBase64(data) {
      return Buffer.from(
        data.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString('utf-8');
    }

    function extractFromPart(part) {
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

  /**
   * Get header value from Gmail message
   */
  getHeader(message, headerName) {
    const header = message.payload.headers.find(
      (h) => h.name.toLowerCase() === headerName.toLowerCase()
    );
    return header?.value;
  }

  /**
   * Extract email address from "Name <email>" format
   */
  extractEmail(fromHeader) {
    const match = fromHeader.match(/<(.+?)>/);
    return match ? match[1] : fromHeader;
  }

  /**
   * Extract sender name from "Name <email>" format
   */
  extractName(fromHeader) {
    const match = fromHeader.match(/^(.+?)\s*</);
    return match ? match[1].replace(/"/g, '').trim() : undefined;
  }

  /**
   * Process a single email message
   */
  async processMessage(messageId) {
    try {
      const message = await this.getMessage(messageId);

      // Extract email metadata
      const senderEmail = this.getHeader(message, 'From') || '';
      const senderName = this.extractName(senderEmail);
      const subject = this.getHeader(message, 'Subject') || '';
      const receivedAt = new Date(parseInt(message.internalDate));
      const emailBody = this.extractEmailBody(message);
      const bodyHash = generateEmailBodyHash(emailBody);
      const provider = this.parserRegistry.detectProvider(message, senderEmail, subject);

      // Store email in database
      const emailData = {
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
      console.log(`      ✓ Email stored (ID: ${emailId})`);

      // Parse and store transaction if provider detected
      if (provider) {
        const saved = await this.parseAndStoreTransaction(
          emailId,
          emailBody,
          message,
          senderEmail,
          subject,
          provider
        );

        if (saved) {
          this.stats.transactionsSaved++;
        } else {
          this.stats.duplicatesSkipped++;
        }
      } else {
        console.log(`      ⊘ No provider detected (${subject.substring(0, 50)}...)`);
      }

      this.stats.processedEmails++;
      return true;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Check if it's a duplicate error (not a real failure)
      if (errorMsg.includes('duplicate key')) {
        console.log(`      ⊘ Already processed (duplicate)`);
        this.stats.duplicatesSkipped++;
        this.stats.processedEmails++;
        return true;
      }

      console.log(`      ✗ Failed: ${errorMsg}`);
      this.stats.failedEmails++;
      this.stats.errors.push({ messageId, error: errorMsg });
      return false;
    }
  }

  /**
   * Parse email and store transaction
   */
  async parseAndStoreTransaction(
    emailId,
    emailBody,
    message,
    senderEmail,
    subject,
    provider
  ) {
    try {
      const result = await this.parserRegistry.parseEmail(
        emailBody,
        message,
        senderEmail,
        subject
      );

      if (!result) {
        console.log(`      ⊘ Failed to parse transaction`);
        return false;
      }

      const { transaction } = result;

      // Get or create merchant
      let merchantId;
      if (transaction.merchant) {
        const categoryId = autoCategorizeMerchantId(transaction.merchant);

        merchantId = await this.dbClient.getOrCreateMerchant({
          name: transaction.merchant,
          normalizedName: normalizeMerchantName(transaction.merchant),
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
      const txnData = {
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
        console.log(`      ✓ Transaction: ${transaction.merchant} - $${transaction.amount}`);
        return true;
      } else {
        console.log(`      ⊘ Duplicate transaction (skipped)`);
        return false;
      }

    } catch (error) {
      console.log(`      ⊘ Transaction storage failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Rate limiting delay
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Print sync statistics
   */
  printStats() {
    const duration = (Date.now() - this.stats.startTime.getTime()) / 1000;

    console.log('\n' + '='.repeat(70));
    console.log('📊 SYNC STATISTICS');
    console.log('='.repeat(70));
    console.log(`Total Emails Found:       ${this.stats.totalEmails}`);
    console.log(`Successfully Processed:   ${this.stats.processedEmails}`);
    console.log(`Transactions Saved:       ${this.stats.transactionsSaved}`);
    console.log(`Duplicates Skipped:       ${this.stats.duplicatesSkipped}`);
    console.log(`Failed:                   ${this.stats.failedEmails}`);
    console.log(`Duration:                 ${duration.toFixed(2)}s`);
    console.log(`Rate:                     ${(this.stats.processedEmails / duration).toFixed(2)} emails/sec`);
    console.log('='.repeat(70) + '\n');

    if (this.stats.errors.length > 0) {
      console.log('❌ Errors:\n');
      this.stats.errors.slice(0, 10).forEach(({ messageId, error }) => {
        console.log(`   ${messageId}: ${error}`);
      });
      if (this.stats.errors.length > 10) {
        console.log(`   ... and ${this.stats.errors.length - 10} more errors\n`);
      }
    }
  }

  /**
   * Main sync execution
   */
  async run() {
    console.log('\n🚀 Starting Daily Email Sync\n');
    console.log(`   Project: ${this.projectId}`);
    console.log(`   Time: ${new Date().toISOString()}\n`);

    try {
      // Initialize Gmail client
      await this.initializeGmail();

      // Calculate date range
      const dateQuery = await this.calculateDateQuery();

      // Fetch message IDs
      const messageIds = await this.listMessages(dateQuery);

      if (messageIds.length === 0) {
        console.log('✓ No new emails to process\n');
        return;
      }

      console.log('📝 Processing emails...\n');

      // Process each message
      for (let i = 0; i < messageIds.length; i++) {
        const messageId = messageIds[i];
        console.log(`\n[${i + 1}/${messageIds.length}] ${messageId}`);

        await this.processMessage(messageId);

        // Rate limiting (except for last message)
        if (i < messageIds.length - 1) {
          await this.delay(RATE_LIMIT_DELAY_MS);
        }
      }

      // Print statistics
      this.printStats();

      console.log('✅ Sync complete!\n');

    } catch (error) {
      console.error('\n❌ Fatal error:', error);
      this.printStats();
      throw error;
    } finally {
      await this.dbClient.close();
    }
  }
}

// Main execution
const sync = new DailyEmailSync();
sync.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { DailyEmailSync };
