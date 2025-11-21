#!/usr/bin/env node
/**
 * Fix Merchant Stats Script
 * Recalculates merchant transaction counts and total amounts from transactions table
 */

import { Client } from 'pg';

const CONNECTION_STRING = process.env.DATABASE_URL ||
  'postgresql://postgres@/fdcdb?host=/cloudsql/mail-reader-433802:us-central1:personal-dashboard-fdc';

async function fixMerchantStats() {
  const client = new Client({
    connectionString: CONNECTION_STRING,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    // Check current state
    console.log('Checking current state...');
    const checkResult = await client.query(`
      SELECT
        COUNT(*) as total_merchants,
        COUNT(*) FILTER (WHERE transaction_count = 0) as merchants_with_zero_count,
        COUNT(*) FILTER (WHERE total_amount = 0) as merchants_with_zero_amount
      FROM merchants
    `);
    console.log('Current state:', checkResult.rows[0]);
    console.log('');

    // Update all merchant stats based on actual transactions
    console.log('Updating merchant stats...');
    const updateResult = await client.query(`
      UPDATE merchants m
      SET
        transaction_count = COALESCE(t.txn_count, 0),
        total_amount = COALESCE(t.txn_total, 0),
        updated_at = NOW()
      FROM (
        SELECT
          merchant_id,
          COUNT(*) as txn_count,
          SUM(amount) as txn_total
        FROM transactions
        WHERE merchant_id IS NOT NULL
        GROUP BY merchant_id
      ) t
      WHERE m.id = t.merchant_id
    `);
    console.log(`✅ Updated ${updateResult.rowCount} merchants\n`);

    // Verify the fix
    console.log('Verifying fix - Top 10 merchants by transaction count:');
    const verifyResult = await client.query(`
      SELECT
        m.id,
        m.name,
        m.transaction_count,
        m.total_amount,
        (SELECT COUNT(*) FROM transactions WHERE merchant_id = m.id) as actual_count,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE merchant_id = m.id) as actual_total
      FROM merchants m
      ORDER BY m.transaction_count DESC
      LIMIT 10
    `);

    console.table(verifyResult.rows.map(row => ({
      ID: row.id,
      Name: row.name.substring(0, 30),
      'DB Count': row.transaction_count,
      'Actual Count': row.actual_count,
      'DB Total': `$${parseFloat(row.total_amount).toFixed(2)}`,
      'Actual Total': `$${parseFloat(row.actual_total).toFixed(2)}`,
      Match: row.transaction_count === parseInt(row.actual_count) &&
             parseFloat(row.total_amount).toFixed(2) === parseFloat(row.actual_total).toFixed(2)
             ? '✅' : '❌'
    })));

    // Check if trigger exists
    console.log('\nChecking if update trigger exists...');
    const triggerResult = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE trigger_name = 'update_merchant_stats_trigger'
    `);

    if (triggerResult.rows.length > 0) {
      console.log('✅ Trigger exists:', triggerResult.rows);
    } else {
      console.log('⚠️  WARNING: Trigger does not exist!');
      console.log('The trigger should be created to keep stats updated automatically.');
      console.log('Consider running the schema.sql file to create the trigger.');
    }

    console.log('\n✅ Done! Merchant stats have been recalculated.');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixMerchantStats();
