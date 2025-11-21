#!/usr/bin/env npx tsx
/**
 * Script to find merchant name mismatches between transactions and merchants table
 */

import { initializeApp, getApps } from 'firebase/app';
import { getDataConnect } from 'firebase/data-connect';

// Import from generated SDK
const path = require('path');
const generatedPath = path.resolve(__dirname, '../web/dashboard/src/generated/esm/index.esm.js');
const {
  connectorConfig,
  listTransactions,
  listMerchants,
} = require(generatedPath);

async function main() {
  console.log('🔍 Finding merchant name mismatches...\n');

  // Initialize Firebase
  if (!getApps().length) {
    initializeApp({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802',
    });
  }

  const dataConnect = getDataConnect(connectorConfig);

  try {
    // Get all merchants from DB
    console.log('📥 Fetching merchants from database...');
    const merchantsResult = await listMerchants(dataConnect, { limit: 10000 });
    const dbMerchants = merchantsResult.data.merchants || [];
    console.log(`Found ${dbMerchants.length} merchants in database`);

    // Create a map of merchant names
    const dbMerchantNames = new Set(dbMerchants.map((m: any) => m.name));

    // Get all transactions
    console.log('📥 Fetching transactions...');
    const transactionsResult = await listTransactions(dataConnect, { limit: 10000 });
    const transactions = transactionsResult.data.transactions || [];
    console.log(`Found ${transactions.length} total transactions`);

    // Find unique merchant names in transactions
    const txnMerchantNames = new Set<string>();
    transactions.forEach((txn: any) => {
      if (txn.merchantName) {
        txnMerchantNames.add(txn.merchantName);
      }
    });

    console.log(`\nUnique merchant names in transactions: ${txnMerchantNames.size}`);

    // Find merchant names that are in transactions but not in merchants table
    const missingInDB = Array.from(txnMerchantNames).filter(name => !dbMerchantNames.has(name));

    console.log(`\n📊 Merchant names in transactions but NOT in merchants table: ${missingInDB.length}\n`);

    if (missingInDB.length > 0) {
      missingInDB.forEach((name, idx) => {
        const count = transactions.filter((txn: any) => txn.merchantName === name).length;
        console.log(`${idx + 1}. "${name}" (${count} transactions)`);
      });

      console.log(`\n✅ These ${missingInDB.length} merchants need to be added to the database.`);
    } else {
      console.log('✅ All merchant names from transactions exist in the merchants table!');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

// Run the script
main().catch(console.error);
