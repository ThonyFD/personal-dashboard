/**
 * Script to add missing merchants to the database
 * Finds all merchants that appear in transactions but not in the merchants table
 * and inserts them with proper normalization and auto-categorization
 */

import { initializeApp } from 'firebase/app';
import { getDataConnect, executeQuery, executeMutation } from 'firebase/data-connect';

// Firebase configuration
const firebaseConfig = {
  projectId: 'mail-reader-433802',
};

const app = initializeApp(firebaseConfig);
const dc = getDataConnect();

// Normalize merchant name for database (same as ingestor)
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Auto-categorize based on merchant name patterns
function autoCategorizeMerchant(merchantName: string): string {
  const name = merchantName.toLowerCase();

  // Food & Dining
  if (name.includes('restaurant') || name.includes('cafe') || name.includes('coffee') ||
      name.includes('pizza') || name.includes('burger') || name.includes('sushi') ||
      name.includes('mcdonald') || name.includes('subway') || name.includes('domino') ||
      name.includes('kfc') || name.includes('wendy') || name.includes('pollo')) {
    return 'Food & Dining';
  }

  // Groceries
  if (name.includes('super') || name.includes('market') || name.includes('grocery') ||
      name.includes('99') || name.includes('riba smith') || name.includes('machetazo') ||
      name.includes('xtra') || name.includes('romero')) {
    return 'Groceries';
  }

  // Transport
  if (name.includes('uber') || name.includes('taxi') || name.includes('transport') ||
      name.includes('gas') || name.includes('gasolina') || name.includes('terpel') ||
      name.includes('shell') || name.includes('puma') || name.includes('delta')) {
    return 'Transportation';
  }

  // Shopping
  if (name.includes('store') || name.includes('shop') || name.includes('amazon') ||
      name.includes('ebay') || name.includes('mall') || name.includes('tienda') ||
      name.includes('boutique')) {
    return 'Shopping';
  }

  // Utilities
  if (name.includes('cable') || name.includes('internet') || name.includes('agua') ||
      name.includes('luz') || name.includes('electricity') || name.includes('water') ||
      name.includes('cableonda') || name.includes('cable & wireless') ||
      name.includes('cwp') || name.includes('naturgy')) {
    return 'Utilities';
  }

  // Entertainment
  if (name.includes('netflix') || name.includes('spotify') || name.includes('cinema') ||
      name.includes('movie') || name.includes('teatro') || name.includes('game') ||
      name.includes('youtube') || name.includes('disney')) {
    return 'Entertainment';
  }

  // Health
  if (name.includes('farmacia') || name.includes('pharmacy') || name.includes('doctor') ||
      name.includes('hospital') || name.includes('clinic') || name.includes('medic') ||
      name.includes('arrocha') || name.includes('metro')) {
    return 'Healthcare';
  }

  return 'Other';
}

async function main() {
  console.log('🔍 Finding merchants not in database...\n');

  try {
    // Get all transactions with their merchant information
    const transactionsQuery = `
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
    `;

    console.log('📥 Fetching all transactions...');
    const result = await executeQuery(dc, transactionsQuery, {});
    const transactions = result.data.transactions || [];
    console.log(`Found ${transactions.length} total transactions`);

    // Find merchants that exist in transactions but not in merchants table
    const merchantStats = new Map<string, { count: number; total: number; txnIds: number[]; normalizedName: string }>();
    const existingNormalizedNames = new Set<string>();

    // First, get all existing merchants to check normalized names
    const existingMerchantsQuery = `
      query GetAllExistingMerchants {
        merchants {
          id
          name
          normalizedName
        }
      }
    `;

    console.log('📥 Fetching existing merchants...');
    const existingResult = await executeQuery(dc, existingMerchantsQuery, {});
    const existingMerchants = existingResult.data.merchants || [];
    console.log(`Found ${existingMerchants.length} existing merchants in DB`);

    existingMerchants.forEach((merchant: any) => {
      existingNormalizedNames.add(merchant.normalizedName);
    });

    transactions.forEach((txn: any) => {
      if (txn.merchantName) {
        const normalizedName = normalizeName(txn.merchantName);

        // Track merchant stats
        if (!merchantStats.has(txn.merchantName)) {
          merchantStats.set(txn.merchantName, { count: 0, total: 0, txnIds: [], normalizedName });
        }
        const stats = merchantStats.get(txn.merchantName)!;
        stats.count++;
        stats.total += txn.amount || 0;
        stats.txnIds.push(txn.id);
      }
    });

    // Find missing merchants by checking normalized names
    const missingMerchants = Array.from(merchantStats.entries())
      .filter(([name, stats]) => !existingNormalizedNames.has(stats.normalizedName))
      .sort((a, b) => b[1].count - a[1].count); // Sort by transaction count

    console.log(`\n📊 Found ${missingMerchants.length} merchants NOT in database:\n`);

    if (missingMerchants.length === 0) {
      console.log('✅ All merchants are already in the database!');
      return;
    }

    // Display the list
    missingMerchants.forEach(([name, stats], idx) => {
      console.log(`${idx + 1}. ${name}`);
      console.log(`   Normalized: ${stats.normalizedName}, Transactions: ${stats.count}, Total: $${stats.total.toFixed(2)}`);
    });

    // Get next available ID
    const merchantsQuery = `
      query GetMaxMerchantId {
        merchants(orderBy: { id: DESC }, limit: 1) {
          id
        }
      }
    `;

    const maxIdResult = await executeQuery(dc, merchantsQuery, {});
    let nextId = 1;

    if (maxIdResult.data.merchants && maxIdResult.data.merchants.length > 0) {
      nextId = maxIdResult.data.merchants[0].id + 1;
    }

    console.log(`\n🔨 Starting insertion with ID: ${nextId}\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const [merchantName, stats] of missingMerchants) {
      const normalizedName = stats.normalizedName;
      const category = autoCategorizeMerchant(merchantName);

      try {
        // Check again if merchant was created by another process (race condition protection)
        const checkQuery = `
          query CheckMerchantExists($normalizedName: String!) {
            merchants(where: { normalizedName: { eq: $normalizedName } }, limit: 1) {
              id
              name
            }
          }
        `;

        const checkResult = await executeQuery(dc, checkQuery, { normalizedName });
        if (checkResult.data.merchants && checkResult.data.merchants.length > 0) {
          const existingMerchant = checkResult.data.merchants[0];
          console.log(`⚠️  Merchant already exists (created by another process): ${merchantName} -> ${existingMerchant.name} (ID: ${existingMerchant.id})`);

          // Update transactions to reference existing merchant
          for (const txnId of stats.txnIds) {
            const updateMutation = `
              mutation UpdateTransactionMerchant($id: Int!, $merchantId: Int!) {
                transaction_update(
                  key: { id: $id }
                  data: { merchantId: $merchantId }
                )
              }
            `;

            await executeMutation(dc, updateMutation, {
              id: txnId,
              merchantId: existingMerchant.id
            });
          }

          console.log(`   ✓ Updated ${stats.txnIds.length} transaction(s) to reference existing merchant\n`);
          successCount++;
          continue;
        }

        // Create merchant
        const createMutation = `
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
        `;

        await executeMutation(dc, createMutation, {
          id: nextId,
          name: merchantName,
          normalizedName: normalizedName,
          category: category
        });

        console.log(`✅ Created: ${merchantName}`);
        console.log(`   ID: ${nextId}, Category: ${category}, Normalized: ${normalizedName}`);

        // Update all transactions to reference this merchant
        for (const txnId of stats.txnIds) {
          const updateMutation = `
            mutation UpdateTransactionMerchant($id: Int!, $merchantId: Int!) {
              transaction_update(
                key: { id: $id }
                data: { merchantId: $merchantId }
              )
            }
          `;

          await executeMutation(dc, updateMutation, {
            id: txnId,
            merchantId: nextId
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
main()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
