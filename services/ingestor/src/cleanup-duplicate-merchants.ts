import { initializeApp, getApps } from 'firebase/app';
import { getDataConnect } from 'firebase/data-connect';

// Import generated SDK
const generated = require('./generated/index.cjs.js');
const { connectorConfig, listMerchants, getTransactionsByMerchant, updateTransactionMerchant, deleteMerchant } = generated;

interface Merchant {
  id: number;
  name: string;
  normalized_name: string;
  category: string | null;
}

interface Transaction {
  id: number;
  merchantId: number | null;
  merchantName: string | null;
}

async function main() {
  console.log('🔍 Starting duplicate merchant cleanup...\n');

  // Initialize Firebase
  if (!getApps().length) {
    initializeApp({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802',
    });
  }

  const dataConnect = getDataConnect(connectorConfig);

  // Step 1: Fetch all merchants (paginated, but get all)
  console.log('📊 Fetching all merchants...');
  const allMerchants: Merchant[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const merchantsResult = await listMerchants(dataConnect, { limit, offset });
    const batch = merchantsResult.data.merchants || [];

    if (batch.length === 0) break;

    batch.forEach((m: any) => {
      allMerchants.push({
        id: m.id,
        name: m.name,
        normalized_name: m.normalizedName,
        category: m.category,
      });
    });

    if (batch.length < limit) break;
    offset += limit;
  }

  console.log(`   Found ${allMerchants.length} total merchants\n`);

  // Step 2: Group by normalized_name to find duplicates
  const grouped = new Map<string, Merchant[]>();
  allMerchants.forEach(m => {
    const existing = grouped.get(m.normalized_name) || [];
    existing.push(m);
    grouped.set(m.normalized_name, existing);
  });

  const duplicates = Array.from(grouped.entries()).filter(([_, list]) => list.length > 1);

  if (duplicates.length === 0) {
    console.log('✅ No duplicate merchants found!');
    return;
  }

  console.log(`⚠️  Found ${duplicates.length} duplicate merchant groups:\n`);

  // Step 3: For each duplicate group, merge into one
  let totalMerged = 0;
  let totalDeleted = 0;

  for (const [normalizedName, merchantList] of duplicates) {
    console.log(`\n📦 Processing: ${normalizedName}`);
    console.log(`   Duplicates: ${merchantList.length}`);
    merchantList.forEach(m => console.log(`     - ID: ${m.id}, Name: ${m.name}, Category: ${m.category || 'N/A'}`));

    // Remove duplicates by ID within the list (in case the same ID appears multiple times)
    const uniqueMerchants = Array.from(
      new Map(merchantList.map(m => [m.id, m])).values()
    );

    // Keep the oldest merchant (lowest ID) as the canonical one
    uniqueMerchants.sort((a, b) => a.id - b.id);
    const keepMerchant = uniqueMerchants[0];
    const deleteMerchants = uniqueMerchants.slice(1);

    console.log(`   ✓ Keeping merchant ID: ${keepMerchant.id} (${keepMerchant.name})`);

    // Step 4: Update all transactions pointing to duplicate merchants
    for (const dupMerchant of deleteMerchants) {
      console.log(`   → Updating transactions from merchant ID ${dupMerchant.id} to ${keepMerchant.id}...`);

      // Fetch transactions for this duplicate merchant
      const txnResult = await getTransactionsByMerchant(dataConnect, { merchantId: dupMerchant.id });
      const transactions: Transaction[] = txnResult.data.transactions || [];

      console.log(`     Found ${transactions.length} transactions to update`);

      // Update each transaction
      for (const txn of transactions) {
        await updateTransactionMerchant(dataConnect, { id: txn.id, merchantId: keepMerchant.id });
      }

      totalMerged += transactions.length;

      // Step 5: Delete the duplicate merchant
      console.log(`   → Deleting duplicate merchant ID ${dupMerchant.id}...`);
      await deleteMerchant(dataConnect, { id: dupMerchant.id });
      totalDeleted++;
    }

    console.log(`   ✅ Merged ${normalizedName}`);
  }

  console.log(`\n\n✨ Cleanup complete!`);
  console.log(`   📊 Processed ${duplicates.length} duplicate groups`);
  console.log(`   🔄 Updated ${totalMerged} transaction references`);
  console.log(`   🗑️  Deleted ${totalDeleted} duplicate merchants\n`);
}

main().catch(err => {
  console.error('❌ Error during cleanup:', err);
  process.exit(1);
});
