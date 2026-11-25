#!/usr/bin/env tsx
/**
 * Verify transaction stats
 */
import { DatabaseClient } from '../../services/ingestor/src/database/client';

async function main() {
  const db = new DatabaseClient();

  try {
    console.log('🔍 Getting transaction statistics...\n');

    const stats = await db.getTransactionStats();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TRANSACTION STATISTICS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`Total transactions: ${stats.total}`);
    console.log(`Last 24 hours: ${stats.last24h}`);
    console.log(`Last 7 days: ${stats.last7d}`);
    console.log(`Latest transaction date: ${stats.latestDate}`);

    console.log('\n✅ Stats retrieved successfully!\n');

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
