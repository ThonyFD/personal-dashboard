#!/usr/bin/env npx tsx
/**
 * Verify that categories are now in the database
 */

import { initializeApp, getApps } from 'firebase/app';
import { getDataConnect } from 'firebase/data-connect';

// Import from generated SDK
import {
  connectorConfig,
  listMerchants,
} from '../dataconnect/generated/esm/index.esm.js';

async function main() {
  console.log('🔍 Verifying merchant categories...\n');

  // Initialize Firebase
  if (!getApps().length) {
    initializeApp({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802',
    });
  }

  const dataConnect = getDataConnect(connectorConfig);

  // Fetch all merchants
  const result = await listMerchants(dataConnect, { limit: 20 });
  const merchants = result.data.merchants || [];

  console.log(`Showing first ${merchants.length} merchants:\n`);

  merchants.forEach((merchant: any, index: number) => {
    const categoryIcon = merchant.category ? '✅' : '❌';
    console.log(`${index + 1}. ${categoryIcon} ${merchant.name}`);
    console.log(`   Category: ${merchant.category || 'NULL'}`);
    console.log(`   ID: ${merchant.id}\n`);
  });

  const withCategory = merchants.filter((m: any) => m.category).length;
  const percentage = ((withCategory / merchants.length) * 100).toFixed(1);

  console.log(`📊 Summary: ${withCategory}/${merchants.length} (${percentage}%) have categories`);
}

main().catch(console.error);
