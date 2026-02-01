#!/usr/bin/env npx tsx

/**
 * Script to verify manual transactions were inserted correctly
 */

import { getManualTransactions } from '../web/dashboard/src/generated/esm/index.esm.js';
import { dataConnect } from '../web/dashboard/src/lib/firebase';

async function main() {
  console.log('Verifying manual transactions for December 2024...\n');

  try {
    const result = await getManualTransactions(dataConnect, {
      year: 2024,
      month: 12,
      isPaid: null, // Get all transactions
    });

    const transactions = result.data.manualTransactions || [];

    console.log(`Total transactions: ${transactions.length}`);

    if (transactions.length === 0) {
      console.log('No transactions found!');
      return;
    }

    // Count by status
    const paidCount = transactions.filter((t: any) => t.isPaid).length;
    const pendingCount = transactions.filter((t: any) => !t.isPaid).length;

    console.log(`  - Paid (A): ${paidCount}`);
    console.log(`  - Pending (P): ${pendingCount}`);
    console.log('');

    // Calculate totals
    const totalAmount = transactions.reduce((sum: number, t: any) => sum + t.amount, 0);
    const paidAmount = transactions
      .filter((t: any) => t.isPaid)
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    const pendingAmount = transactions
      .filter((t: any) => !t.isPaid)
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    console.log('Amounts:');
    console.log(`  - Total: $${totalAmount.toFixed(2)}`);
    console.log(`  - Paid: $${paidAmount.toFixed(2)}`);
    console.log(`  - Pending: $${pendingAmount.toFixed(2)}`);
    console.log('');

    // Group by payment method
    const byMethod = new Map<string, { count: number; amount: number; paid: number; pending: number }>();
    transactions.forEach((t: any) => {
      const method = t.paymentMethod || 'Unknown';
      if (!byMethod.has(method)) {
        byMethod.set(method, { count: 0, amount: 0, paid: 0, pending: 0 });
      }
      const stats = byMethod.get(method)!;
      stats.count++;
      stats.amount += t.amount;
      if (t.isPaid) {
        stats.paid++;
      } else {
        stats.pending++;
      }
    });

    console.log('By payment method:');
    Array.from(byMethod.entries())
      .sort((a, b) => b[1].amount - a[1].amount)
      .forEach(([method, stats]) => {
        console.log(`  - ${method}:`);
        console.log(`      Total: ${stats.count} transactions ($${stats.amount.toFixed(2)})`);
        console.log(`      Paid: ${stats.paid}, Pending: ${stats.pending}`);
      });
    console.log('');

    // Group by transaction type
    const byType = new Map<string, { count: number; amount: number }>();
    transactions.forEach((t: any) => {
      const type = t.transactionType || 'Regular';
      if (!byType.has(type)) {
        byType.set(type, { count: 0, amount: 0 });
      }
      const stats = byType.get(type)!;
      stats.count++;
      stats.amount += t.amount;
    });

    console.log('By transaction type:');
    Array.from(byType.entries())
      .sort((a, b) => b[1].amount - a[1].amount)
      .forEach(([type, stats]) => {
        console.log(`  - ${type}: ${stats.count} transactions ($${stats.amount.toFixed(2)})`);
      });
    console.log('');

    // Show first 5 transactions
    console.log('First 5 transactions:');
    transactions.slice(0, 5).forEach((t: any) => {
      const status = t.isPaid ? 'A' : 'P';
      const day = t.day ? `Day ${t.day}` : 'No day';
      const type = t.transactionType ? `[${t.transactionType}]` : '';
      console.log(`  - ${t.description} ${type}: $${t.amount} (${t.paymentMethod}) [${status}] ${day}`);
    });

  } catch (error) {
    console.error('Error verifying transactions:', error);
    throw error;
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
