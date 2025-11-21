/**
 * Script to populate default categories
 * Run this from browser console or as a one-time setup
 */

import { createNewCategory } from '../api/categories-client';

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

export async function populateDefaultCategories() {
  console.log('🔄 Starting to populate default categories...');

  let created = 0;
  let errors = 0;

  for (const category of DEFAULT_CATEGORIES) {
    try {
      await createNewCategory(
        category.id,
        category.name,
        category.icon,
        category.color,
        category.description,
        true // isDefault = true for default categories
      );
      console.log(`✅ ${category.icon} ${category.name} created`);
      created++;
    } catch (error: any) {
      console.error(`❌ Failed to create ${category.name}:`, error.message);
      errors++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total: ${DEFAULT_CATEGORIES.length}`);

  if (created > 0) {
    console.log('\n✅ Done! Refresh the page to see the categories.');
  }
}

// Export for use in console
(window as any).populateDefaultCategories = populateDefaultCategories;
