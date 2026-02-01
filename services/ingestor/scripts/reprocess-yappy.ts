#!/usr/bin/env node
/**
 * Reprocess Yappy emails to fix merchant names
 *
 * This script:
 * 1. Fetches all Yappy email message IDs from the database
 * 2. Re-downloads the email content from Gmail
 * 3. Re-parses using the Yappy parser (which extracts the correct merchant from "A:" field)
 * 4. Updates merchants and transactions with the correct information
 */

import { createRequire } from 'module';
import { GmailClient } from '../src/gmail/client.js';
import { YappyParser } from '../src/parsers/yappy.js';
import { Logger } from '../src/utils/logger.js';
import { connectorConfig } from '@google-cloud/data-connect';

const require = createRequire(import.meta.url);
const { executeQuery, executeMutation } = require('../src/generated/index.cjs.js');

// Import pg for direct database access
import pkg from 'pg';
const { Pool } = pkg;

interface YappyEmail {
  id: number;
  gmail_message_id: string;
  subject: string;
}

interface MerchantRecord {
  id: number;
  name: string;
  normalized_name: string;
}

async function main() {
  Logger.info('Starting Yappy reprocessing', { event: 'reprocess_start' });

  // Set up database connection
  const connectionString = process.env.POSTGRES_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('POSTGRES_CONNECTION_STRING environment variable is required');
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  // Get max merchant ID to start generating new IDs from
  const maxIdResult = await pool.query<{ max: number | null }>('SELECT MAX(id) as max FROM merchants');
  let nextMerchantId = (maxIdResult.rows[0].max || 0) + 1;
  Logger.info(`Starting merchant ID generation from ${nextMerchantId}`, { event: 'id_init' });

  try {
    // Step 1: Get all Yappy email message IDs
    Logger.info('Fetching Yappy emails from database', { event: 'fetch_emails' });

    const emailsResult = await pool.query<YappyEmail>(`
      SELECT DISTINCT e.id, e.gmail_message_id, e.subject
      FROM emails e
      JOIN transactions t ON t.email_id = e.id
      JOIN merchants m ON t.merchant_id = m.id
      WHERE e.provider = 'yappy'
        AND m.name = 'Yappy Payment'
      ORDER BY e.id
    `);

    const emails = emailsResult.rows;
    Logger.info(`Found ${emails.length} Yappy emails to reprocess`, {
      event: 'emails_found',
      count: emails.length,
    });

    if (emails.length === 0) {
      Logger.info('No emails to reprocess', { event: 'reprocess_complete' });
      return;
    }

    // Step 2: Initialize Gmail client
    Logger.info('Initializing Gmail client', { event: 'gmail_init' });
    const gmailClient = new GmailClient();
    await gmailClient.initialize();

    // Initialize Yappy parser
    const yappyParser = new YappyParser();

    // Step 3: Process each email
    let processed = 0;
    let updated = 0;
    let errors = 0;

    for (const email of emails) {
      try {
        Logger.info(`Processing email ${processed + 1}/${emails.length}`, {
          event: 'process_email',
          emailId: email.id,
          gmailMessageId: email.gmail_message_id,
        });

        // Fetch email from Gmail
        const gmailMessage = await gmailClient.getMessage(email.gmail_message_id);

        // Extract email body
        const emailBody = extractEmailBody(gmailMessage);
        if (!emailBody) {
          Logger.warn('Could not extract email body', {
            event: 'extract_body_failed',
            emailId: email.id,
          });
          errors++;
          continue;
        }

        // Log first email body for debugging
        if (processed === 0) {
          Logger.info('Sample email body (first 500 chars):', {
            event: 'sample_body',
            body: emailBody.substring(0, 500),
          });
        }

        // Parse the email
        const parsed = yappyParser.parse(emailBody, gmailMessage);
        if (!parsed || !parsed.merchant) {
          Logger.warn('Could not parse merchant from email', {
            event: 'parse_failed',
            emailId: email.id,
          });
          errors++;
          continue;
        }

        // Check if merchant is still "Yappy Payment"
        if (parsed.merchant === 'Yappy Payment') {
          Logger.warn('Parser still returned "Yappy Payment"', {
            event: 'parse_fallback',
            emailId: email.id,
            subject: email.subject,
          });
          errors++;
          continue;
        }

        Logger.info(`Extracted merchant: ${parsed.merchant}`, {
          event: 'merchant_extracted',
          emailId: email.id,
          merchant: parsed.merchant,
        });

        // Step 4: Get or create the correct merchant
        const normalizedName = normalizeMerchantName(parsed.merchant);

        // Check if merchant already exists
        let merchantId: number;
        const existingMerchant = await pool.query<MerchantRecord>(
          'SELECT id, name, normalized_name FROM merchants WHERE normalized_name = $1',
          [normalizedName]
        );

        if (existingMerchant.rows.length > 0) {
          merchantId = existingMerchant.rows[0].id;
          Logger.info(`Using existing merchant`, {
            event: 'merchant_exists',
            merchantId,
            merchantName: existingMerchant.rows[0].name,
          });
        } else {
          // Create new merchant with manually generated ID
          merchantId = nextMerchantId++;
          await pool.query(
            `INSERT INTO merchants (id, name, normalized_name, first_seen_at, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW(), NOW())`,
            [merchantId, parsed.merchant, normalizedName]
          );
          Logger.info(`Created new merchant`, {
            event: 'merchant_created',
            merchantId,
            merchantName: parsed.merchant,
          });
        }

        // Step 5: Update the transaction
        await pool.query(
          `UPDATE transactions
           SET merchant_id = $1,
               merchant_name = $2,
               merchant_raw = $2,
               updated_at = NOW()
           WHERE email_id = $3`,
          [merchantId, parsed.merchant, email.id]
        );

        Logger.info(`Updated transaction`, {
          event: 'transaction_updated',
          emailId: email.id,
          merchantId,
          merchantName: parsed.merchant,
        });

        updated++;
        processed++;

        // Add a small delay to avoid hitting Gmail API rate limits
        if (processed % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        Logger.error('Error processing email', {
          event: 'process_email_error',
          emailId: email.id,
          error: error instanceof Error ? error.message : String(error),
        });
        errors++;
        processed++;
      }
    }

    Logger.info('Reprocessing complete', {
      event: 'reprocess_complete',
      total: emails.length,
      processed,
      updated,
      errors,
    });

    // Step 6: Update merchant statistics
    Logger.info('Updating merchant statistics', { event: 'update_stats' });
    await pool.query(`
      UPDATE merchants m
      SET
        transaction_count = (
          SELECT COUNT(*)
          FROM transactions t
          WHERE t.merchant_id = m.id
        ),
        total_amount = (
          SELECT COALESCE(SUM(t.amount), 0)
          FROM transactions t
          WHERE t.merchant_id = m.id
        ),
        updated_at = NOW()
      WHERE m.id IN (
        SELECT DISTINCT merchant_id
        FROM transactions t
        JOIN emails e ON t.email_id = e.id
        WHERE e.provider = 'yappy'
      )
    `);

    Logger.info('Merchant statistics updated', { event: 'stats_updated' });

  } catch (error) {
    Logger.error('Fatal error during reprocessing', {
      event: 'reprocess_fatal_error',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    await pool.end();
  }
}

/**
 * Extract email body from Gmail message
 */
function extractEmailBody(message: any): string | null {
  try {
    // Try to get the plain text body
    const parts = message.payload?.parts || [message.payload];

    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }

      // Check nested parts
      if (part.parts) {
        for (const nestedPart of part.parts) {
          if (nestedPart.mimeType === 'text/plain' && nestedPart.body?.data) {
            return Buffer.from(nestedPart.body.data, 'base64').toString('utf-8');
          }
        }
      }
    }

    // Fallback to body.data if no parts
    if (message.payload?.body?.data) {
      return Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    }

    return null;
  } catch (error) {
    Logger.error('Error extracting email body', {
      event: 'extract_body_error',
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Normalize merchant name for lookup
 */
function normalizeMerchantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Run the script
main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
