#!/usr/bin/env tsx
/**
 * Simple verification of December transactions
 */
import { DatabaseClient } from '../services/ingestor/src/database/client';

async function main() {
  const db = new DatabaseClient();

  try {
    console.log('🔍 Fetching all transactions from database...\n');

    // Get all transactions using the database client
    const allTransactions = await db.getAllTransactions();

    // Filter for December 9-16
    const decTransactions = allTransactions.filter((txn: any) => {
      const txnDate = new Date(txn.txnDate);
      const startDate = new Date('2025-12-09T00:00:00-05:00'); // Panama timezone
      const endDate = new Date('2025-12-17T00:00:00-05:00');
      return txnDate >= startDate && txnDate < endDate;
    });

    console.log(`✅ Found ${decTransactions.length} transactions from Dec 9-16, 2025\n`);

    // Group by date
    const byDate: Record<string, { count: number; total: number }> = {};
    decTransactions.forEach((txn: any) => {
      const date = new Date(txn.txnDate).toISOString().split('T')[0];
      if (!byDate[date]) {
        byDate[date] = { count: 0, total: 0 };
      }
      byDate[date].count++;
      byDate[date].total += parseFloat(txn.amount);
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TRANSACTIONS BY DATE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const sortedDates = Object.keys(byDate).sort().reverse();
    let totalCount = 0;
    let totalAmount = 0;

    sortedDates.forEach(date => {
      const { count, total } = byDate[date];
      totalCount += count;
      totalAmount += total;
      console.log(`${date}: ${count} transactions, $${total.toFixed(2)}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`TOTAL: ${totalCount} transactions, $${totalAmount.toFixed(2)}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Show last 10
    console.log('RECENT TRANSACTIONS (last 10):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const sorted = decTransactions.sort((a: any, b: any) =>
      new Date(b.txnDate).getTime() - new Date(a.txnDate).getTime()
    );

    sorted.slice(0, 10).forEach((txn: any) => {
      const date = new Date(txn.txnDate).toISOString().split('T')[0];
      const merchant = (txn.merchantName || '').padEnd(30).slice(0, 30);
      console.log(`${date} | ${merchant} | $${txn.amount} ${txn.currency} | ${txn.provider}`);
    });

    console.log('\n✅ Verification complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
