#!/usr/bin/env npx tsx
/**
 * Script to add missing merchants to the database
 * Finds all merchants that appear in transactions but not in the merchants table
 * and inserts them with proper normalization and auto-categorization
 */

import { initializeApp, getApps } from 'firebase/app';
import { getDataConnect, executeMutation, executeQuery } from 'firebase/data-connect';

// Import from generated SDK
const path = require('path');
const generatedPath = path.resolve(__dirname, '../web/dashboard/src/generated/esm/index.esm.js');
const {
  connectorConfig,
} = require(generatedPath);

// Normalize merchant name for database
function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

// Auto-categorize based on merchant name patterns
function autoCategorizeMerchant(merchantName: string): string {
  const name = merchantName.toUpperCase();

  // Food & Dining
  if (
    name.includes('RESTAURANT') ||
    name.includes('COFFEE') ||
    name.includes('CAFE') ||
    name.includes('PIZZA') ||
    name.includes('BURGER') ||
    name.includes('FOOD') ||
    name.includes('MCDONALD') ||
    name.includes('KFC') ||
    name.includes('SUBWAY') ||
    name.includes('DOMINO') ||
    name.includes('WENDY') ||
    name.includes('POLLO') ||
    name.includes('TACO') ||
    name.includes('SUSHI') ||
    name.includes('GRILL') ||
    name.includes('BISTRO') ||
    name.includes('DINER') ||
    name.includes('BAKERY') ||
    name.includes('BAR') ||
    name.includes('PUB')
  ) {
    return 'Food & Dining';
  }

  // Groceries
  if (
    name.includes('SUPER') ||
    name.includes('MARKET') ||
    name.includes('GROCERY') ||
    name.includes('99') ||
    name.includes('RIBA SMITH') ||
    name.includes('MACHETAZO') ||
    name.includes('XTRA') ||
    name.includes('ROMERO') ||
    name.includes('EL REY')
  ) {
    return 'Groceries';
  }

  // Transportation
  if (
    name.includes('UBER') ||
    name.includes('TAXI') ||
    name.includes('TRANSPORT') ||
    name.includes('GAS') ||
    name.includes('GASOLINA') ||
    name.includes('TERPEL') ||
    name.includes('SHELL') ||
    name.includes('PUMA') ||
    name.includes('DELTA') ||
    name.includes('FUEL') ||
    name.includes('PARKING')
  ) {
    return 'Transportation';
  }

  // Shopping
  if (
    name.includes('AMAZON') ||
    name.includes('STORE') ||
    name.includes('SHOP') ||
    name.includes('EBAY') ||
    name.includes('MALL') ||
    name.includes('TIENDA') ||
    name.includes('BOUTIQUE') ||
    name.includes('RETAIL') ||
    name.includes('CLOTHING') ||
    name.includes('FASHION')
  ) {
    return 'Shopping';
  }

  // Bills & Utilities
  if (
    name.includes('CABLE') ||
    name.includes('INTERNET') ||
    name.includes('AGUA') ||
    name.includes('LUZ') ||
    name.includes('ELECTRIC') ||
    name.includes('WATER') ||
    name.includes('CABLEONDA') ||
    name.includes('CABLE & WIRELESS') ||
    name.includes('CWP') ||
    name.includes('NATURGY') ||
    name.includes('PHONE') ||
    name.includes('UTILITY')
  ) {
    return 'Bills & Utilities';
  }

  // Entertainment
  if (
    name.includes('NETFLIX') ||
    name.includes('SPOTIFY') ||
    name.includes('CINEMA') ||
    name.includes('MOVIE') ||
    name.includes('TEATRO') ||
    name.includes('GAME') ||
    name.includes('YOUTUBE') ||
    name.includes('DISNEY') ||
    name.includes('HULU') ||
    name.includes('HBO')
  ) {
    return 'Entertainment';
  }

  // Healthcare
  if (
    name.includes('FARMACIA') ||
    name.includes('PHARMACY') ||
    name.includes('DOCTOR') ||
    name.includes('HOSPITAL') ||
    name.includes('CLINIC') ||
    name.includes('MEDIC') ||
    name.includes('ARROCHA') ||
    name.includes('HEALTH') ||
    name.includes('DENTAL')
  ) {
    return 'Healthcare';
  }

  // Investment
  if (
    name.includes('ADMIRAL') ||
    name.includes('MARKETS') ||
    name.includes('TRADING') ||
    name.includes('BROKER') ||
    name.includes('INVEST') ||
    name.includes('SECURITIES') ||
    name.includes('STOCK') ||
    name.includes('CRYPTO') ||
    name.includes('BINANCE') ||
    name.includes('COINBASE')
  ) {
    return 'Investment';
  }

  // Transfers
  if (
    name.includes('YAPPY') ||
    name.includes('NEQUI') ||
    name.includes('TRANSFIYA') ||
    name.includes('TRANSFER') && name.includes('PAYMENT')
  ) {
    return 'Transfers';
  }

  // Services
  if (
    name.includes('SERVICE') ||
    name.includes('REPAIR') ||
    name.includes('CLEANING') ||
    name.includes('SALON') ||
    name.includes('SPA')
  ) {
    return 'Services';
  }

  return 'Other';
}

async function main() {
  console.log('🔍 Finding merchants not in database...\n');

  // Initialize Firebase
  if (!getApps().length) {
    initializeApp({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802',
    });
  }

  const dataConnect = getDataConnect(connectorConfig);

  try {
    // Get all transactions with their merchant information
    console.log('📥 Fetching all transactions...');
    const transactionsResult = await executeQuery(dataConnect, {
      query: `
        query GetAllTransactions {
          transactions {
            id
            merchantName
            amount
            merchant {
              id
              name
            }
          }
        }
      `
    });

    const transactions = transactionsResult.data.transactions || [];
    console.log(`Found ${transactions.length} total transactions`);

    // Find merchants that exist in transactions but not in merchants table
    const merchantStats = new Map<string, { count: number; total: number; txnIds: number[] }>();
    const existingMerchants = new Set<string>();

    transactions.forEach((txn: any) => {
      if (txn.merchantName) {
        // Track merchant stats
        if (!merchantStats.has(txn.merchantName)) {
          merchantStats.set(txn.merchantName, { count: 0, total: 0, txnIds: [] });
        }
        const stats = merchantStats.get(txn.merchantName)!;
        stats.count++;
        stats.total += txn.amount || 0;
        stats.txnIds.push(txn.id);

        // Track if merchant exists in DB
        if (txn.merchant?.id) {
          existingMerchants.add(txn.merchantName);
        }
      }
    });

    // Find missing merchants
    const missingMerchants = Array.from(merchantStats.entries())
      .filter(([name]) => !existingMerchants.has(name))
      .sort((a, b) => b[1].count - a[1].count); // Sort by transaction count

    console.log(`\n📊 Found ${missingMerchants.length} merchants NOT in database:\n`);

    if (missingMerchants.length === 0) {
      console.log('✅ All merchants are already in the database!');
      return;
    }

    // Display the list
    missingMerchants.forEach(([name, stats], idx) => {
      const category = autoCategorizeMerchant(name);
      console.log(`${idx + 1}. ${name}`);
      console.log(`   Category: ${category}, Transactions: ${stats.count}, Total: $${stats.total.toFixed(2)}`);
    });

    // Get next available ID
    const maxIdResult = await executeQuery(dataConnect, {
      query: `
        query GetMaxMerchantId {
          merchants(orderBy: { id: DESC }, limit: 1) {
            id
          }
        }
      `
    });

    let nextId = 1;
    if (maxIdResult.data.merchants && maxIdResult.data.merchants.length > 0) {
      nextId = maxIdResult.data.merchants[0].id + 1;
    }

    console.log(`\n🔨 Starting insertion with ID: ${nextId}\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const [merchantName, stats] of missingMerchants) {
      const normalizedName = normalizeName(merchantName);
      const category = autoCategorizeMerchant(merchantName);

      try {
        // Create merchant
        await executeMutation(dataConnect, {
          mutation: `
            mutation CreateMerchant($id: Int!, $name: String!, $normalizedName: String!, $category: String) {
              merchant_insert(
                data: {
                  id: $id
                  name: $name
                  normalizedName: $normalizedName
                  category: $category
                  transactionCount: 0
                  totalAmount: 0
                }
              )
            }
          `,
          variables: {
            id: nextId,
            name: merchantName,
            normalizedName: normalizedName,
            category: category
          }
        });

        console.log(`✅ Created: ${merchantName}`);
        console.log(`   ID: ${nextId}, Category: ${category}`);

        // Update all transactions to reference this merchant
        for (const txnId of stats.txnIds) {
          await executeMutation(dataConnect, {
            mutation: `
              mutation UpdateTransactionMerchant($id: Int!, $merchantId: Int!) {
                transaction_update(
                  key: { id: $id }
                  data: { merchantId: $merchantId }
                )
              }
            `,
            variables: {
              id: txnId,
              merchantId: nextId
            }
          });
        }

        console.log(`   ✓ Updated ${stats.txnIds.length} transaction(s)\n`);
        successCount++;
        nextId++;

      } catch (error: any) {
        console.error(`❌ Error adding ${merchantName}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Summary:');
    console.log(`✅ Successfully added: ${successCount} merchants`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total processed: ${missingMerchants.length}`);

    if (successCount > 0) {
      console.log('\n🎉 All missing merchants have been added to the database!');
      console.log('💡 Refresh your dashboard to see the changes.');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

// Run the script
main().catch(console.error);
