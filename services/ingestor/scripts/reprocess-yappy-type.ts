#!/usr/bin/env -S node --loader ts-node/esm
/**
 * Reprocess Yappy PAYMENT transactions to determine correct type (INCOME vs TRANSFER)
 *
 * This script:
 * 1. Queries database for Yappy transactions with PAYMENT type
 * 2. Fetches the original emails from Gmail API
 * 3. Re-parses them with the updated parser to detect send/receive
 * 4. Updates txn_type to INCOME (credit) or TRANSFER (debit)
 */

import { GmailClient } from '../src/gmail/client';
import { YappyParser } from '../src/parsers/yappy';
import { Logger } from '../src/utils/logger';
import { GmailMessage } from '../src/types';
import { Client } from 'pg';

interface TransactionToReprocess {
  id: number;
  email_id: number;
  gmail_message_id: string;
  amount: number;
  txn_date: string;
  merchant_name: string;
}

function getDbConfig(): any {
  const config: any = process.env.POSTGRES_CONNECTION_STRING
    ? { connectionString: process.env.POSTGRES_CONNECTION_STRING }
    : {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5433'),
        database: process.env.PGDATABASE || 'fdcdb_dc',
        user: process.env.PGUSER || 'postgres',
      };

  if (process.env.PGPASSWORD !== undefined && process.env.PGPASSWORD !== '') {
    config.password = process.env.PGPASSWORD;
  }

  return config;
}

async function getTransactionsToReprocess(): Promise<TransactionToReprocess[]> {
  const dbClient = new Client(getDbConfig());

  try {
    await dbClient.connect();
    console.log('✓ Connected to database\n');

    const result = await dbClient.query(`
      SELECT
        t.id,
        t.email_id,
        e.gmail_message_id,
        t.amount,
        t.txn_date,
        t.merchant_name
      FROM transactions t
      INNER JOIN emails e ON e.id = t.email_id
      WHERE t.provider = 'yappy'
        AND t.txn_type = 'PAYMENT'
      ORDER BY t.txn_date DESC
    `);

    return result.rows;
  } finally {
    await dbClient.end();
  }
}

async function updateTransactionType(
  transactionId: number,
  newType: 'INCOME' | 'TRANSFER',
  newDescription: string,
  newMerchant: string | null
): Promise<void> {
  const dbClient = new Client(getDbConfig());

  try {
    await dbClient.connect();

    await dbClient.query(
      `UPDATE transactions
       SET txn_type = $1,
           description = $2,
           merchant_name = COALESCE($3, merchant_name)
       WHERE id = $4`,
      [newType, newDescription, newMerchant, transactionId]
    );
  } finally {
    await dbClient.end();
  }
}

async function main() {
  console.log('🔄 Reprocessing Yappy PAYMENT transactions via Gmail API\n');

  // Get transactions to reprocess
  console.log('📋 Fetching transactions to reprocess...');
  const transactions = await getTransactionsToReprocess();
  console.log(`   Found ${transactions.length} transactions\n`);

  if (transactions.length === 0) {
    console.log('✅ No transactions to reprocess');
    return;
  }

  // Initialize Gmail client
  console.log('📧 Initializing Gmail client...');
  const gmailClient = new GmailClient();
  await gmailClient.initialize();
  console.log('   Gmail client ready\n');

  // Initialize parser
  const parser = new YappyParser();

  let processed = 0;
  let updatedToIncome = 0;
  let updatedToTransfer = 0;
  let skipped = 0;
  let errors = 0;

  // Process each transaction
  for (const txn of transactions) {
    processed++;
    const dateStr = new Date(txn.txn_date).toISOString().split('T')[0];
    console.log(`[${processed}/${transactions.length}] ID: ${txn.id} | ${dateStr} | $${txn.amount}`);

    try {
      // Fetch email from Gmail
      const gmailMessage = await gmailClient.getMessage(txn.gmail_message_id);

      if (!gmailMessage) {
        console.log(`   ⚠️  Could not fetch email from Gmail`);
        errors++;
        continue;
      }

      // Extract email body
      const emailBody = gmailClient.extractEmailBody(gmailMessage);

      // Get subject for detection
      const subject = gmailMessage.payload.headers.find(
        (h: any) => h.name.toLowerCase() === 'subject'
      )?.value || '';

      // Check if it's incoming (credit) or outgoing (debit)
      // Patterns for INCOMING (money received - INCOME):
      const isIncoming = /recibiste|te\s+pagaron|te\s+enviaron/i.test(emailBody) ||
                        /recibiste\s+un\s+yappy|yappy\s+recibido|te\s+enviaron\s+por\s+yappy/i.test(subject);

      // Patterns for OUTGOING (money sent - TRANSFER):
      // "Pagaste por Yappy" = payment to a merchant
      // "Enviaste un Yappy" = transfer to a person
      // "Te pidieron un Yappy" = payment request that was paid (still a debit)
      const isOutgoing = /enviaste|pagaste|transferiste/i.test(emailBody) ||
                        /enviaste\s+un\s+yappy|pagaste\s+por\s+yappy|te\s+pidieron\s+un\s+yappy/i.test(subject);

      // Parse to get updated merchant name
      const parsed = parser.parse(emailBody, gmailMessage);
      const newMerchant = parsed?.merchant || null;

      if (isIncoming) {
        await updateTransactionType(
          txn.id,
          'INCOME',
          'Yappy Receive (Credit)',
          newMerchant
        );
        console.log(`   ✓ Updated to INCOME (credit received) | ${newMerchant || 'N/A'}`);
        updatedToIncome++;
      } else if (isOutgoing) {
        await updateTransactionType(
          txn.id,
          'TRANSFER',
          'Yappy Send (Debit)',
          newMerchant
        );
        console.log(`   ✓ Updated to TRANSFER (payment sent) | ${newMerchant || 'N/A'}`);
        updatedToTransfer++;
      } else {
        // Could not determine direction, log for review
        console.log(`   ⚠️  Could not determine direction`);
        console.log(`      Subject: ${subject.substring(0, 50)}...`);
        console.log(`      Body preview: ${emailBody.substring(0, 100).replace(/\n/g, ' ')}...`);
        skipped++;
      }

      // Small delay to avoid Gmail API rate limits
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      errors++;
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`   Total processed:     ${processed}`);
  console.log(`   Updated to INCOME:   ${updatedToIncome} (credits received)`);
  console.log(`   Updated to TRANSFER: ${updatedToTransfer} (payments sent)`);
  console.log(`   Skipped (unknown):   ${skipped}`);
  console.log(`   Errors:              ${errors}`);
  console.log('='.repeat(50));

  // Show final stats
  const dbClient = new Client(getDbConfig());
  await dbClient.connect();
  const finalStats = await dbClient.query(`
    SELECT txn_type, COUNT(*) as count
    FROM transactions
    WHERE provider = 'yappy'
    GROUP BY txn_type
    ORDER BY txn_type
  `);
  await dbClient.end();

  console.log('\n📈 Final Yappy transaction types:');
  for (const row of finalStats.rows) {
    console.log(`   ${row.txn_type}: ${row.count}`);
  }

  console.log('\n✅ Reprocessing completed!');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
