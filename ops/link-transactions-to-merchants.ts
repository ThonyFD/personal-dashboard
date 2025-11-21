#!/usr/bin/env npx tsx
/**
 * Script to link transactions to their corresponding merchants
 * Updates transaction.merchant_id to reference the correct merchant
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
  updateTransactionMerchant
} = require(generatedPath);

async function main() {
  console.log('🔗 Linking transactions to merchants...\n');

  // Initialize Firebase
  if (!getApps().length) {
    initializeApp({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802',
    });
  }

  const dataConnect = getDataConnect(connectorConfig);

  try {
    // Get all merchants
    console.log('📥 Fetching merchants...');
    const merchantsResult = await listMerchants(dataConnect, { limit: 10000 });
    const merchants = merchantsResult.data.merchants || [];
    console.log(`Found ${merchants.length} merchants in DB`);

    // Create a map of merchant name to ID
    const merchantNameToId = new Map<string, number>();
    merchants.forEach((m: any) => {
      merchantNameToId.set(m.name, m.id);
    });

    // Get all transactions
    console.log('📥 Fetching transactions...');
    const transactionsResult = await listTransactions(dataConnect, { limit: 10000 });
    const transactions = transactionsResult.data.transactions || [];
    console.log(`Found ${transactions.length} total transactions`);

    // Find transactions without merchant_id set
    const unlinkedTransactions = transactions.filter((txn: any) =>
      txn.merchantName && !txn.merchant
    );

    console.log(`\n📊 Found ${unlinkedTransactions.length} transactions without merchant link\n`);

    if (unlinkedTransactions.length === 0) {
      console.log('✅ All transactions are already linked to merchants!');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;

    for (const txn of unlinkedTransactions) {
      const merchantName = txn.merchantName;
      const merchantId = merchantNameToId.get(merchantName);

      if (!merchantId) {
        console.log(`⚠️  Merchant not found for: ${merchantName} (txn ${txn.id})`);
        notFoundCount++;
        continue;
      }

      try {
        await updateTransactionMerchant(dataConnect, {
          id: txn.id,
          merchantId: merchantId
        });

        successCount++;
        if (successCount % 100 === 0) {
          console.log(`   ✓ Linked ${successCount} transactions...`);
        }

      } catch (error: any) {
        console.error(`❌ Error linking txn ${txn.id} to merchant ${merchantName}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Summary:');
    console.log(`✅ Successfully linked: ${successCount} transactions`);
    console.log(`⚠️  Merchant not found: ${notFoundCount} transactions`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total processed: ${unlinkedTransactions.length}`);

    if (successCount > 0) {
      console.log('\n🎉 Transactions have been linked to merchants!');
      console.log('💡 Refresh your dashboard to see the changes.');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

// Run the script
main().catch(console.error);
