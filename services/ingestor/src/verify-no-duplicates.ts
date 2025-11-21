import { initializeApp, getApps } from 'firebase/app';
import { getDataConnect } from 'firebase/data-connect';

// Import generated SDK
const generated = require('./generated/index.cjs.js');
const { connectorConfig, listMerchants } = generated;

async function main() {
  console.log('🔍 Verifying no duplicate merchants...\n');

  // Initialize Firebase
  if (!getApps().length) {
    initializeApp({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802',
    });
  }

  const dataConnect = getDataConnect(connectorConfig);

  // Fetch all merchants
  console.log('📊 Fetching all merchants...');
  const allMerchants: any[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const merchantsResult = await listMerchants(dataConnect, { limit, offset });
    const batch = merchantsResult.data.merchants || [];

    if (batch.length === 0) break;
    allMerchants.push(...batch);

    if (batch.length < limit) break;
    offset += limit;
  }

  console.log(`   Found ${allMerchants.length} total merchants\n`);

  // Group by normalized_name
  const grouped = new Map<string, any[]>();
  allMerchants.forEach(m => {
    const existing = grouped.get(m.normalizedName) || [];
    existing.push(m);
    grouped.set(m.normalizedName, existing);
  });

  const duplicates = Array.from(grouped.entries()).filter(([_, list]) => list.length > 1);

  if (duplicates.length === 0) {
    console.log('✅ SUCCESS! No duplicate merchants found.');
    console.log(`   All ${allMerchants.length} merchants have unique normalized names.\n`);
  } else {
    console.log(`❌ FAILED! Still found ${duplicates.length} duplicate merchant groups:\n`);
    duplicates.forEach(([normName, list]) => {
      console.log(`  ${normName}: ${list.length} duplicates`);
      list.forEach(m => console.log(`    - ID: ${m.id}, Name: ${m.name}`));
    });
  }
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
