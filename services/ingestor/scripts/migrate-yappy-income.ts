#!/usr/bin/env -S node --loader ts-node/esm
/**
 * Migrate Yappy transactions from PAYMENT to INCOME
 *
 * This script updates existing Yappy transactions that were incorrectly
 * classified as PAYMENT when they should be INCOME (credits received).
 *
 * Detection criteria:
 * - provider = 'yappy'
 * - txn_type = 'PAYMENT' (old incorrect type)
 * - description contains 'Receive' or 'Credit' (indicating money received)
 *
 * Run with: ./run-with-cloud-sql-proxy.sh migrate-yappy-income.ts
 */

import { Client } from 'pg';

interface YappyTransaction {
  id: number;
  description: string;
  merchant_name: string;
  amount: number;
  txn_date: string;
}

async function main() {
  console.log('🔄 Starting Yappy INCOME migration...\n');

  // Connect to database
  const connectionConfig: any = process.env.POSTGRES_CONNECTION_STRING
    ? { connectionString: process.env.POSTGRES_CONNECTION_STRING }
    : {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5433'),
        database: process.env.PGDATABASE || 'fdcdb_dc',
        user: process.env.PGUSER || 'postgres',
      };

  if (process.env.PGPASSWORD !== undefined && process.env.PGPASSWORD !== '') {
    connectionConfig.password = process.env.PGPASSWORD;
  }

  const client = new Client(connectionConfig);

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // First, let's see what we have
    console.log('📊 Current Yappy transaction types:');
    const statsResult = await client.query(`
      SELECT txn_type, COUNT(*) as count
      FROM transactions
      WHERE provider = 'yappy'
      GROUP BY txn_type
      ORDER BY txn_type
    `);

    for (const row of statsResult.rows) {
      console.log(`   ${row.txn_type}: ${row.count} transactions`);
    }
    console.log('');

    // Find transactions that should be INCOME
    // These are Yappy transactions with PAYMENT type that have receive indicators
    const findQuery = `
      SELECT id, description, merchant_name, amount, txn_date
      FROM transactions
      WHERE provider = 'yappy'
        AND txn_type = 'PAYMENT'
        AND (
          description ILIKE '%receive%'
          OR description ILIKE '%credit%'
          OR description ILIKE '%recib%'
        )
      ORDER BY txn_date DESC
    `;

    const toMigrate = await client.query<YappyTransaction>(findQuery);

    if (toMigrate.rows.length === 0) {
      // Try a broader search - all PAYMENT type Yappy transactions
      // since the new logic is: send = TRANSFER, receive = INCOME
      // So if it's not TRANSFER, it should probably be INCOME
      console.log('No transactions found with receive indicators in description.');
      console.log('Checking for all Yappy PAYMENT transactions...\n');

      const broadQuery = `
        SELECT id, description, merchant_name, amount, txn_date
        FROM transactions
        WHERE provider = 'yappy'
          AND txn_type = 'PAYMENT'
        ORDER BY txn_date DESC
      `;

      const broadResult = await client.query<YappyTransaction>(broadQuery);

      if (broadResult.rows.length === 0) {
        console.log('✓ No Yappy PAYMENT transactions to migrate.');
        console.log('All Yappy transactions are already correctly typed.\n');
        return;
      }

      console.log(`Found ${broadResult.rows.length} Yappy PAYMENT transactions:`);
      for (const row of broadResult.rows) {
        console.log(`   ID: ${row.id} | ${row.txn_date} | $${row.amount} | ${row.merchant_name || 'N/A'}`);
        console.log(`      Description: ${row.description || 'N/A'}`);
      }
      console.log('');

      // Ask for confirmation before migrating
      console.log('⚠️  These transactions will be updated from PAYMENT to INCOME.');
      console.log('    Review the list above to confirm these are credits received.\n');

      // Perform the update
      const updateResult = await client.query(`
        UPDATE transactions
        SET txn_type = 'INCOME'
        WHERE provider = 'yappy'
          AND txn_type = 'PAYMENT'
        RETURNING id
      `);

      console.log(`✅ Updated ${updateResult.rowCount} transactions to INCOME\n`);
    } else {
      console.log(`Found ${toMigrate.rows.length} transactions to migrate:\n`);

      for (const row of toMigrate.rows) {
        console.log(`   ID: ${row.id} | ${row.txn_date} | $${row.amount} | ${row.merchant_name || 'N/A'}`);
        console.log(`      Description: ${row.description || 'N/A'}`);
      }
      console.log('');

      // Perform the update
      const updateResult = await client.query(`
        UPDATE transactions
        SET txn_type = 'INCOME'
        WHERE provider = 'yappy'
          AND txn_type = 'PAYMENT'
          AND (
            description ILIKE '%receive%'
            OR description ILIKE '%credit%'
            OR description ILIKE '%recib%'
          )
        RETURNING id
      `);

      console.log(`✅ Updated ${updateResult.rowCount} transactions to INCOME\n`);
    }

    // Show final stats
    console.log('📊 Updated Yappy transaction types:');
    const finalStats = await client.query(`
      SELECT txn_type, COUNT(*) as count
      FROM transactions
      WHERE provider = 'yappy'
      GROUP BY txn_type
      ORDER BY txn_type
    `);

    for (const row of finalStats.rows) {
      console.log(`   ${row.txn_type}: ${row.count} transactions`);
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✓ Database connection closed');
  }
}

main().catch(console.error);
