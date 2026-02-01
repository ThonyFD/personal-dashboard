#!/usr/bin/env -S node --loader ts-node/esm
/**
 * Reprocess Banistmo emails from Gmail API to extract correct merchants
 * This script:
 * 1. Queries database for transactions with "Banistmo Payment" merchant
 * 2. Fetches the original emails from Gmail
 * 3. Re-parses them with the updated parser
 * 4. Updates transactions with correct merchant (avoiding duplicates)
 */

import { GmailClient } from '../src/gmail/client';
import { BanistmoParser } from '../src/parsers/banistmo';
import { DatabaseClient } from '../src/database/client';
import { Logger } from '../src/utils/logger';
import { GmailMessage } from '../src/types';

interface EmailToReprocess {
  id: number;
  gmail_message_id: string;
  transaction_id: number;
}

async function getEmailsToReprocess(db: DatabaseClient): Promise<EmailToReprocess[]> {
  // We need to use raw SQL for this query
  // Since Firebase Data Connect doesn't support complex joins easily,
  // we'll need to query via the generated SDK

  // For now, let's do this in a simpler way:
  // 1. Get all transactions with "Banistmo Payment" merchant
  // 2. Get their email IDs
  // 3. Get the gmail_message_id for each email

  Logger.info('Fetching emails to reprocess from database', {
    event: 'fetch_emails_start',
  });

  // Use direct Postgres connection via Cloud SQL Auth Proxy
  // Assumes cloud-sql-proxy is running on localhost:5432 or uses env vars
  const { Client } = require('pg');

  const connectionConfig: any = process.env.POSTGRES_CONNECTION_STRING
    ? { connectionString: process.env.POSTGRES_CONNECTION_STRING }
    : {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432'),
        database: process.env.PGDATABASE || 'fdcdb_dc',
        user: process.env.PGUSER || 'postgres',
      };

  // Only add password if explicitly provided
  if (process.env.PGPASSWORD !== undefined && process.env.PGPASSWORD !== '') {
    connectionConfig.password = process.env.PGPASSWORD;
  }

  const dbClient = new Client(connectionConfig);

  try {
    await dbClient.connect();
    Logger.info('Connected to Postgres', {
      event: 'db_connected',
      host: connectionConfig.host || 'connection_string',
    });
  } catch (error) {
    Logger.error('Failed to connect to database', {
      event: 'db_connect_failed',
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      'Could not connect to database. Make sure cloud-sql-proxy is running or set POSTGRES_CONNECTION_STRING'
    );
  }

  const result = await dbClient.query(`
    SELECT DISTINCT
      e.id,
      e.gmail_message_id,
      t.id as transaction_id
    FROM emails e
    INNER JOIN transactions t ON t.email_id = e.id
    INNER JOIN merchants m ON t.merchant_id = m.id
    WHERE e.provider = 'banistmo'
      AND m.name = 'Banistmo Payment'
    ORDER BY e.received_at DESC
  `);

  await dbClient.end();

  Logger.info('Emails fetched', {
    event: 'fetch_emails_complete',
    count: result.rows.length,
  });

  return result.rows;
}

async function fetchEmailFromGmail(
  gmailClient: GmailClient,
  messageId: string
): Promise<GmailMessage | null> {
  try {
    const message = await gmailClient.getMessage(messageId);
    return message;
  } catch (error) {
    Logger.error('Failed to fetch email from Gmail', {
      event: 'gmail_fetch_error',
      messageId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function updateTransactionMerchant(
  transactionId: number,
  newMerchantName: string
): Promise<void> {
  const { Client } = require('pg');

  const connectionConfig: any = process.env.POSTGRES_CONNECTION_STRING
    ? { connectionString: process.env.POSTGRES_CONNECTION_STRING }
    : {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432'),
        database: process.env.PGDATABASE || 'fdcdb_dc',
        user: process.env.PGUSER || 'postgres',
      };

  // Only add password if explicitly provided
  if (process.env.PGPASSWORD !== undefined && process.env.PGPASSWORD !== '') {
    connectionConfig.password = process.env.PGPASSWORD;
  }

  const dbClient = new Client(connectionConfig);

  await dbClient.connect();

  try {
    // Get or create merchant
    let merchantResult = await dbClient.query(
      'SELECT id FROM merchants WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))',
      [newMerchantName]
    );

    let merchantId: number;

    if (merchantResult.rows.length === 0) {
      // Create new merchant
      const categoryResult = await dbClient.query(
        "SELECT id FROM categories WHERE name = 'Otros' LIMIT 1"
      );
      const categoryId = categoryResult.rows[0]?.id;

      const insertResult = await dbClient.query(
        `INSERT INTO merchants (name, normalized_name, category_id, transaction_count, total_amount)
         VALUES ($1, UPPER(REGEXP_REPLACE($1, '[^A-Z0-9]', '', 'g')), $2, 0, 0)
         ON CONFLICT (name) DO NOTHING
         RETURNING id`,
        [newMerchantName, categoryId]
      );

      if (insertResult.rows.length > 0) {
        merchantId = insertResult.rows[0].id;
        Logger.info('Created new merchant', {
          event: 'merchant_created',
          merchantName: newMerchantName,
          merchantId,
        });
      } else {
        // Conflict occurred, fetch the existing merchant
        merchantResult = await dbClient.query(
          'SELECT id FROM merchants WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))',
          [newMerchantName]
        );
        merchantId = merchantResult.rows[0].id;
      }
    } else {
      merchantId = merchantResult.rows[0].id;
    }

    // Update transaction
    await dbClient.query(
      'UPDATE transactions SET merchant_id = $1, merchant_name = $2 WHERE id = $3',
      [merchantId, newMerchantName, transactionId]
    );

    Logger.info('Transaction updated', {
      event: 'transaction_updated',
      transactionId,
      newMerchantId: merchantId,
      newMerchantName,
    });
  } finally {
    await dbClient.end();
  }
}

async function updateMerchantStats(): Promise<void> {
  const { Client } = require('pg');

  const connectionConfig: any = process.env.POSTGRES_CONNECTION_STRING
    ? { connectionString: process.env.POSTGRES_CONNECTION_STRING }
    : {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432'),
        database: process.env.PGDATABASE || 'fdcdb_dc',
        user: process.env.PGUSER || 'postgres',
      };

  // Only add password if explicitly provided
  if (process.env.PGPASSWORD !== undefined && process.env.PGPASSWORD !== '') {
    connectionConfig.password = process.env.PGPASSWORD;
  }

  const dbClient = new Client(connectionConfig);

  await dbClient.connect();

  try {
    await dbClient.query(`
      UPDATE merchants m
      SET
        transaction_count = COALESCE(stats.cnt, 0),
        total_amount = COALESCE(stats.total, 0),
        last_transaction_date = stats.last_date
      FROM (
        SELECT
          merchant_id,
          COUNT(*) as cnt,
          SUM(amount) as total,
          MAX(transaction_date) as last_date
        FROM transactions
        WHERE merchant_id IS NOT NULL
        GROUP BY merchant_id
      ) stats
      WHERE m.id = stats.merchant_id
    `);

    Logger.info('Merchant stats updated', {
      event: 'merchant_stats_updated',
    });

    // Remove "Banistmo Payment" if no longer used
    await dbClient.query(`
      DELETE FROM merchants
      WHERE name = 'Banistmo Payment'
        AND transaction_count = 0
        AND NOT EXISTS (
          SELECT 1 FROM transactions WHERE merchant_id = merchants.id
        )
    `);
  } finally {
    await dbClient.end();
  }
}

async function main() {
  try {
    Logger.info('Starting Banistmo reprocessing', {
      event: 'reprocess_start',
    });

    // Initialize Gmail client
    const gmailClient = new GmailClient();
    await gmailClient.initialize();

    // Initialize database client
    const db = new DatabaseClient();

    // Get emails to reprocess
    console.log('📧 Fetching emails to reprocess...');
    const emails = await getEmailsToReprocess(db);
    console.log(`Found ${emails.length} emails to reprocess`);

    if (emails.length === 0) {
      console.log('✅ No emails to reprocess');
      return;
    }

    // Initialize parser
    const parser = new BanistmoParser();

    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Process each email
    for (const email of emails) {
      processed++;
      console.log(`\n[${processed}/${emails.length}] Processing email ${email.gmail_message_id.substring(0, 12)}...`);

      try {
        // Fetch email from Gmail
        const gmailMessage = await fetchEmailFromGmail(gmailClient, email.gmail_message_id);

        if (!gmailMessage) {
          console.log(`  ⚠️  Could not fetch email from Gmail`);
          errors++;
          continue;
        }

        // Extract email body
        const emailBody = gmailClient.extractEmailBody(gmailMessage);

        // Parse email with updated parser
        const parsed = parser.parse(emailBody, gmailMessage);

        if (!parsed || !parsed.merchant) {
          console.log(`  ⚠️  Could not extract merchant from email`);
          skipped++;
          continue;
        }

        if (parsed.merchant === 'Banistmo Payment') {
          console.log(`  ⚠️  Parser still returning "Banistmo Payment"`);
          skipped++;
          continue;
        }

        // Update transaction with new merchant
        await updateTransactionMerchant(email.transaction_id, parsed.merchant);
        console.log(`  ✓ Updated to merchant: "${parsed.merchant}"`);
        updated++;

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.log(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        errors++;
      }
    }

    // Update merchant statistics
    console.log('\n🔄 Updating merchant statistics...');
    await updateMerchantStats();

    console.log('\n📊 Summary:');
    console.log(`  Emails processed: ${processed}`);
    console.log(`  Transactions updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors: ${errors}`);

    console.log('\n✅ Reprocessing completed!');

    Logger.info('Reprocessing complete', {
      event: 'reprocess_complete',
      processed,
      updated,
      skipped,
      errors,
    });

  } catch (error) {
    Logger.error('Reprocessing failed', {
      event: 'reprocess_failed',
      error: error instanceof Error ? error.message : String(error),
    });
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
