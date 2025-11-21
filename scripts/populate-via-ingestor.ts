#!/usr/bin/env npx tsx
/**
 * Populate categories using the ingestor's Data Connect SDK
 */

import { getDataConnect } from '@google-cloud/firebase-data-connect';
import { connectorConfig, createCategory } from '../services/ingestor/src/generated/index.cjs.js';

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Food & Dining', icon: '🍽️', color: '#FF6B6B', description: 'Restaurants, Coffee shops, Fast food, Bars' },
  { id: 2, name: 'Groceries', icon: '🛒', color: '#4ECB71', description: 'Supermarkets, Grocery stores' },
  { id: 3, name: 'Transportation', icon: '🚗', color: '#4ECDC4', description: 'Uber, Gas stations, Parking, Tolls' },
  { id: 4, name: 'Entertainment', icon: '🎮', color: '#9B59B6', description: 'Netflix, Gaming, Movies, Streaming services' },
  { id: 5, name: 'Shopping', icon: '🛍️', color: '#F39C12', description: 'Amazon, Retail stores, Clothing' },
  { id: 6, name: 'Bills & Utilities', icon: '💡', color: '#3498DB', description: 'Electric, Water, Internet, Phone' },
  { id: 7, name: 'Healthcare', icon: '🏥', color: '#E74C3C', description: 'Hospitals, Pharmacies, Doctors' },
  { id: 8, name: 'Travel', icon: '✈️', color: '#1ABC9C', description: 'Hotels, Airlines, Airbnb' },
  { id: 9, name: 'Education', icon: '📚', color: '#2ECC71', description: 'Schools, Universities, Online courses' },
  { id: 10, name: 'Services', icon: '🔧', color: '#95A5A6', description: 'Repairs, Cleaning, Salons' },
  { id: 11, name: 'Subscriptions', icon: '📱', color: '#E67E22', description: 'Monthly memberships, Recurring services' },
  { id: 12, name: 'Transfers', icon: '💸', color: '#34495E', description: 'Yappy, Bank transfers, P2P payments' },
  { id: 13, name: 'Investment', icon: '📈', color: '#27AE60', description: 'Admiral Markets, Brokers, Trading platforms' },
  { id: 14, name: 'Pago Mensual', icon: '💳', color: '#8E44AD', description: 'Loan payments, Mortgages, Financing' },
  { id: 15, name: 'Other', icon: '📦', color: '#95A5A6', description: 'Uncategorized transactions' },
];

async function main() {
  console.log('🔄 Connecting to Data Connect...\n');

  const dataConnect = getDataConnect(connectorConfig);

  console.log('📝 Creating categories...\n');

  let created = 0;
  let errors = 0;

  for (const category of DEFAULT_CATEGORIES) {
    try {
      await createCategory(dataConnect, {
        id: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        description: category.description,
        isDefault: true,
      });
      console.log(`✅ ${category.icon} ${category.name}`);
      created++;
    } catch (error: any) {
      // Ignore duplicate errors
      if (error.message?.includes('duplicate') || error.message?.includes('already exists')) {
        console.log(`⚠️  ${category.icon} ${category.name} (already exists)`);
      } else {
        console.error(`❌ ${category.icon} ${category.name}: ${error.message}`);
        errors++;
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📦 Total: ${DEFAULT_CATEGORIES.length}`);

  if (created > 0) {
    console.log('\n✨ Success! Categories added to database.');
    console.log('🔄 Refresh your dashboard to see them.');
  } else if (errors === 0) {
    console.log('\n✅ All categories already exist.');
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
