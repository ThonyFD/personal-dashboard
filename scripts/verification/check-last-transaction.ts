#!/usr/bin/env tsx
/**
 * Check last processed transaction
 */
import { initializeApp, getApps } from 'firebase/app';
import { getDataConnect } from 'firebase/data-connect';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const generated = require('../services/ingestor/src/generated/index.cjs.js');

async function main() {
  try {
    console.log('🔍 Initializing Firebase Data Connect...\n');

    if (!getApps().length) {
      const firebaseConfig = {
        projectId: process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802',
      };
      initializeApp(firebaseConfig);
    }

    const dataConnect = getDataConnect(generated.connectorConfig);

    console.log('📊 Fetching latest transaction...\n');

    // Get latest transaction
    const latestResult = await generated.getLatestTransaction(dataConnect);

    if (!latestResult.data || !latestResult.data.transactions || latestResult.data.transactions.length === 0) {
      console.log('❌ No transactions found in database!\n');
      return;
    }

    const latest = latestResult.data.transactions[0];
    const latestDate = new Date(latest.txnDate);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('LAST PROCESSED TRANSACTION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Date:          ${latestDate.toISOString().split('T')[0]}`);
    console.log(`Time:          ${latestDate.toISOString()}`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Get all transactions to show recent ones
    console.log('📝 Fetching recent transactions...\n');
    const allResult = await generated.getAllTransactions(dataConnect);

    if (allResult.data?.transactions) {
      const txns = allResult.data.transactions;
      console.log(`📊 Total transactions in DB: ${txns.length}\n`);

      // Sort by date descending
      const sorted = [...txns].sort((a: any, b: any) =>
        new Date(b.txnDate).getTime() - new Date(a.txnDate).getTime()
      );

      console.log('RECENT TRANSACTIONS (last 15):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      sorted.slice(0, 15).forEach((txn: any, idx: number) => {
        const date = new Date(txn.txnDate).toISOString().split('T')[0];
        console.log(`${idx + 1}. ${date}`);
      });
    }

    console.log('\n✅ Check complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
