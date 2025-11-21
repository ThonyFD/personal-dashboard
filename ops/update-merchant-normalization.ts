#!/usr/bin/env npx tsx
/**
 * Script to update all merchants' normalized_name to use simple normalization (lowercase + trim)
 * This ensures consistency with the new merchant matching logic
 */

import { initializeApp, getApps } from 'firebase/app';
import { getDataConnect } from 'firebase/data-connect';

// Import generated SDK
const path = require('path');
const generatedPath = path.resolve(__dirname, '../services/ingestor/src/generated/index.cjs.js');
const { connectorConfig, listMerchants, updateMerchantNormalizedName } = require(generatedPath);

// Import simple normalization
const hashPath = path.resolve(__dirname, '../services/ingestor/src/utils/hash.ts');
const { simpleNormalizeMerchantName } = require(hashPath);

async function main() {
  console.log('🔄 Updating merchant normalization...\n');

  // Initialize Firebase
  if (!getApps().length) {
    initializeApp({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802',
    });
  }

  const dataConnect = getDataConnect(connectorConfig);

  try {
    // Get all merchants
    console.log('📥 Fetching all merchants...');
    const merchantsResult = await listMerchants(dataConnect, { limit: 10000 });
    const merchants = merchantsResult.data.merchants || [];
    console.log(`Found ${merchants.length} merchants`);

    let updatedCount = 0;

    for (const merchant of merchants) {
      const currentNormalized = merchant.normalizedName;
      const newNormalized = simpleNormalizeMerchantName(merchant.name);

      if (currentNormalized !== newNormalized) {
        console.log(`Updating merchant ${merchant.id}: "${merchant.name}"`);
        console.log(`  From: "${currentNormalized}"`);
        console.log(`  To:   "${newNormalized}"`);

        await updateMerchantNormalizedName(dataConnect, {
          id: merchant.id,
          normalizedName: newNormalized,
        });

        updatedCount++;
      }
    }

    console.log(`\n✅ Updated ${updatedCount} merchants' normalized names`);

    if (updatedCount > 0) {
      console.log('\n💡 Now running cleanup to merge any remaining duplicates...');

      // Run the cleanup script
      const cleanupPath = path.resolve(__dirname, '../services/ingestor/src/cleanup-duplicate-merchants.ts');
      const cleanup = require(cleanupPath);
      await cleanup.main();
    } else {
      console.log('✅ No updates needed - all merchants already use simple normalization');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

// Run the script
main().catch(console.error);