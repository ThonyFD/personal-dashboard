/**
 * Script to populate the merchants table from existing transactions
 * This ensures all merchants exist in the database before we try to update categories
 */

import { initializeApp } from 'firebase/app';
import { getDataConnect, executeQuery, executeMutation } from 'firebase/data-connect';

// Firebase configuration - use your actual config
const firebaseConfig = {
  projectId: 'mail-reader-433802',
  // Add other config as needed
};

const app = initializeApp(firebaseConfig);

async function populateMerchants() {
  console.log('Starting merchant population...');

  try {
    // First, get all merchants from transactions
    const transactionsQuery = `
      query GetAllTransactions {
        transactions {
          merchantName
          merchant {
            id
            name
          }
        }
      }
    `;

    console.log('Fetching transactions...');
    const result = await executeQuery(getDataConnect(), transactionsQuery, {});

    const transactions = result.data.transactions || [];
    console.log(`Found ${transactions.length} transactions`);

    // Group by merchant name
    const merchantNames = new Set<string>();
    const existingMerchants = new Set<string>();

    transactions.forEach((txn: any) => {
      if (txn.merchantName) {
        merchantNames.add(txn.merchantName);
      }
      if (txn.merchant?.name) {
        existingMerchants.add(txn.merchant.name);
      }
    });

    console.log(`Found ${merchantNames.size} unique merchant names`);
    console.log(`${existingMerchants.size} already exist in merchants table`);

    // Get the max ID from existing merchants
    const merchantsQuery = `
      query GetMaxMerchantId {
        merchants(orderBy: { id: DESC }, limit: 1) {
          id
        }
      }
    `;

    const maxIdResult = await executeQuery(getDataConnect(), merchantsQuery, {});
    let nextId = 1;

    if (maxIdResult.data.merchants && maxIdResult.data.merchants.length > 0) {
      nextId = maxIdResult.data.merchants[0].id + 1;
    }

    console.log(`Next available ID: ${nextId}`);

    // Create missing merchants
    const missingMerchants = Array.from(merchantNames).filter(
      name => !existingMerchants.has(name)
    );

    console.log(`Need to create ${missingMerchants.length} merchants`);

    for (const merchantName of missingMerchants) {
      const normalizedName = merchantName.toUpperCase().replace(/[^A-Z0-9]/g, '');

      const createMutation = `
        mutation CreateMerchant($id: Int!, $name: String!, $normalizedName: String!) {
          merchant_insert(
            data: {
              id: $id
              name: $name
              normalizedName: $normalizedName
              transactionCount: 0
              totalAmount: 0
            }
          )
        }
      `;

      try {
        await executeMutation(getDataConnect(), createMutation, {
          id: nextId,
          name: merchantName,
          normalizedName: normalizedName,
        });

        console.log(`Created merchant: ${merchantName} (ID: ${nextId})`);
        nextId++;
      } catch (error) {
        console.error(`Failed to create merchant ${merchantName}:`, error);
      }
    }

    console.log('Merchant population complete!');
  } catch (error) {
    console.error('Error populating merchants:', error);
    throw error;
  }
}

// Run the script
populateMerchants()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
