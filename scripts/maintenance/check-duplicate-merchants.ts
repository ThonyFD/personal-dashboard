#!/usr/bin/env tsx
/**
 * Check for Duplicate Merchants
 *
 * Finds merchants with the same normalizedName but different IDs.
 * This helps identify merchants that should be consolidated.
 *
 * Usage (from project root):
 *   cd services/ingestor
 *   npx tsx ../../scripts/maintenance/check-duplicate-merchants.ts
 *
 * Or use the helper script:
 *   ./scripts/maintenance/run-check-duplicates.sh
 */

import { initializeApp, getApps } from 'firebase/app';
import { getDataConnect } from 'firebase/data-connect';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load generated SDK from ingestor service
const require = createRequire(import.meta.url);
const generatedPath = join(__dirname, '../../services/ingestor/src/generated/index.cjs.js');
const generated = require(generatedPath);

interface Merchant {
  id: number;
  name: string;
  normalizedName: string;
  categoryId: number | null;
  transactionCount: number;
  totalAmount: number;
}

async function main() {
  console.log('🔍 Checking for duplicate merchants...\n');

  try {
    // Initialize Firebase
    if (!getApps().length) {
      const firebaseConfig = {
        projectId: process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802',
      };
      initializeApp(firebaseConfig);
    }

    const dataConnect = getDataConnect(generated.connectorConfig);

    // Get all merchants
    console.log('📊 Fetching all merchants from database...');
    const result = await generated.ListMerchants(dataConnect, {});

    if (!result.data?.merchants || result.data.merchants.length === 0) {
      console.log('❌ No merchants found in database!\n');
      return;
    }

    const merchants: Merchant[] = result.data.merchants;
    console.log(`✓ Found ${merchants.length} total merchants\n`);

    // Group by normalized name
    const grouped: Record<string, Merchant[]> = {};
    merchants.forEach((merchant) => {
      const normalized = merchant.normalizedName || merchant.name.toLowerCase().trim();
      if (!grouped[normalized]) {
        grouped[normalized] = [];
      }
      grouped[normalized].push(merchant);
    });

    // Find duplicates
    const duplicates = Object.entries(grouped).filter(([_, list]) => list.length > 1);

    if (duplicates.length === 0) {
      console.log('✅ No duplicate merchants found! All merchants are unique.\n');
      return;
    }

    // Calculate statistics
    const totalDuplicateEntries = duplicates.reduce((sum, [_, list]) => sum + list.length, 0);
    const potentialConsolidation = duplicates.length;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  DUPLICATE MERCHANTS FOUND');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Unique normalized names with duplicates: ${duplicates.length}`);
    console.log(`Total duplicate entries: ${totalDuplicateEntries}`);
    console.log(`Merchants that could be consolidated: ${totalDuplicateEntries - potentialConsolidation}`);
    console.log(`Potential reduction: ${((totalDuplicateEntries - potentialConsolidation) / merchants.length * 100).toFixed(1)}%\n`);

    // Sort by transaction count (most impactful first)
    duplicates.sort((a, b) => {
      const sumA = a[1].reduce((sum, m) => sum + (m.transactionCount || 0), 0);
      const sumB = b[1].reduce((sum, m) => sum + (m.transactionCount || 0), 0);
      return sumB - sumA;
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('DUPLICATE DETAILS (sorted by impact)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    duplicates.forEach(([normalizedName, list], index) => {
      const totalTxns = list.reduce((sum, m) => sum + (m.transactionCount || 0), 0);
      const totalAmount = list.reduce((sum, m) => sum + (m.totalAmount || 0), 0);

      console.log(`${index + 1}. Normalized: "${normalizedName}"`);
      console.log(`   Total transactions: ${totalTxns}`);
      console.log(`   Total amount: $${totalAmount.toFixed(2)}`);
      console.log(`   Duplicate entries: ${list.length}\n`);

      list.forEach((merchant, idx) => {
        const categoryName = merchant.categoryId ? `Category ${merchant.categoryId}` : 'No category';
        console.log(`   ${String.fromCharCode(97 + idx)}) ID: ${merchant.id} | Name: "${merchant.name}"`);
        console.log(`      ${categoryName} | Txns: ${merchant.transactionCount || 0} | Amount: $${(merchant.totalAmount || 0).toFixed(2)}`);
      });
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('RECOMMENDATIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. Review the duplicates above and identify which should be consolidated');
    console.log('2. For each group, choose the merchant with:');
    console.log('   - Most transactions (primary indicator)');
    console.log('   - Best category assignment');
    console.log('   - Most accurate name');
    console.log('3. Use the consolidation script to merge duplicates\n');

    console.log('⚠️  IMPORTANT: After fixing the merchant creation logic,');
    console.log('   new duplicates should not be created.\n');

    // Show example consolidation
    if (duplicates.length > 0) {
      const [normalizedName, list] = duplicates[0];
      const primary = list.reduce((prev, curr) =>
        (curr.transactionCount || 0) > (prev.transactionCount || 0) ? curr : prev
      );
      const toDelete = list.filter(m => m.id !== primary.id);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('EXAMPLE CONSOLIDATION (Top duplicate)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      console.log(`Normalized name: "${normalizedName}"`);
      console.log(`\nKeep: ID ${primary.id} - "${primary.name}"`);
      console.log(`      ${primary.transactionCount || 0} transactions, $${(primary.totalAmount || 0).toFixed(2)}\n`);

      if (toDelete.length > 0) {
        console.log('Merge and delete:');
        toDelete.forEach(m => {
          console.log(`  - ID ${m.id} - "${m.name}" (${m.transactionCount || 0} txns, $${(m.totalAmount || 0).toFixed(2)})`);
        });
        console.log('\nSQL to consolidate:');
        console.log('```sql');
        console.log(`-- Update transactions to use primary merchant`);
        toDelete.forEach(m => {
          console.log(`UPDATE transactions SET merchant_id = ${primary.id} WHERE merchant_id = ${m.id};`);
        });
        console.log(`\n-- Delete duplicate merchants`);
        toDelete.forEach(m => {
          console.log(`DELETE FROM merchants WHERE id = ${m.id};`);
        });
        console.log('```\n');
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('\n💡 Make sure you run this from the ingestor service directory:');
    console.error('   cd services/ingestor');
    console.error('   npx tsx ../../scripts/maintenance/check-duplicate-merchants.ts\n');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
