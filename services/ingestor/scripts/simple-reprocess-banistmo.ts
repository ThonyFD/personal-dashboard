#!/usr/bin/env tsx
/**
 * Simple script to reprocess Banistmo emails
 * Requires: PGHOST, PGDATABASE, PGUSER, PGPASSWORD environment variables
 */

import { GmailClient } from '../src/gmail/client';
import { BanistmoParser } from '../src/parsers/banistmo';
import { Logger } from '../src/utils/logger';
import { Client } from 'pg';

interface EmailToReprocess {
  id: number;
  gmail_message_id: string;
  transaction_id: number;
}

async function main() {
  // Connect to database
  const dbClient = new Client();
  await dbClient.connect();
  console.log('✓ Connected to database');

  try {
    // Fetch emails to reprocess
    console.log('\n📧 Fetching Banistmo emails to reprocess...');
    const result = await dbClient.query<EmailToReprocess>(`
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
      LIMIT 200
    `);

    const emails = result.rows;
    console.log(`Found ${emails.length} emails to reprocess`);

    if (emails.length === 0) {
      console.log('✅ No emails to reprocess');
      return;
    }

    // Initialize Gmail client
    console.log('\n🔑 Initializing Gmail client...');
    const gmailClient = new GmailClient();
    await gmailClient.initialize();
    console.log('✓ Gmail client initialized');

    // Initialize parser
    const parser = new BanistmoParser();

    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Process each email
    for (const email of emails) {
      processed++;
      const progress = `[${processed}/${emails.length}]`;
      console.log(`\n${progress} Processing ${email.gmail_message_id.substring(0, 12)}...`);

      try {
        // Fetch email from Gmail
        const gmailMessage = await gmailClient.getMessage(email.gmail_message_id);
        const emailBody = gmailClient.extractEmailBody(gmailMessage);

        // Parse with updated parser
        const parsed = parser.parse(emailBody, gmailMessage);

        if (!parsed || !parsed.merchant) {
          console.log(`  ⚠️  Could not extract merchant`);
          skipped++;
          continue;
        }

        if (parsed.merchant === 'Banistmo Payment') {
          console.log(`  ⚠️  Still parsing as "Banistmo Payment"`);
          skipped++;
          continue;
        }

        // Get or create merchant
        let merchantResult = await dbClient.query(
          'SELECT id FROM merchants WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))',
          [parsed.merchant]
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
             ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [parsed.merchant, categoryId]
          );

          merchantId = insertResult.rows[0].id;
          console.log(`  ➕ Created merchant: "${parsed.merchant}"`);
        } else {
          merchantId = merchantResult.rows[0].id;
        }

        // Update transaction
        await dbClient.query(
          'UPDATE transactions SET merchant_id = $1, merchant_name = $2 WHERE id = $3',
          [merchantId, parsed.merchant, email.transaction_id]
        );

        console.log(`  ✓ Updated to: "${parsed.merchant}"`);
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
    console.log('✓ Merchant statistics updated');

    // Remove "Banistmo Payment" if no longer used
    const deleteResult = await dbClient.query(`
      DELETE FROM merchants
      WHERE name = 'Banistmo Payment'
        AND transaction_count = 0
        AND NOT EXISTS (
          SELECT 1 FROM transactions WHERE merchant_id = merchants.id
        )
      RETURNING name
    `);

    if (deleteResult.rows.length > 0) {
      console.log('✓ Removed unused "Banistmo Payment" merchant');
    }

    console.log('\n📊 Summary:');
    console.log(`  Emails processed: ${processed}`);
    console.log(`  Transactions updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors: ${errors}`);

    console.log('\n✅ Reprocessing completed!');

  } finally {
    await dbClient.end();
  }
}

main().catch(console.error);
