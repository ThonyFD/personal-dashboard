#!/usr/bin/env npx tsx
/**
 * Script to populate categories using Data Connect API
 */

// This script will run after the schema is deployed
// and use the CreateCategory mutation to populate default categories

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
  { id: 13, name: 'Investment', icon: '📈', color: '#27AE60', description: 'Admiral Markets, Brokers, Trading platforms, Crypto exchanges' },
  { id: 14, name: 'Pago Mensual', icon: '💳', color: '#8E44AD', description: 'Loan payments, Mortgages, Financing' },
  { id: 15, name: 'Other', icon: '📦', color: '#95A5A6', description: 'Uncategorized transactions' },
] as const;

async function main() {
  console.log('📝 This script shows you the SQL to populate categories.');
  console.log('\nCategories will be automatically created when you deploy Data Connect.');
  console.log('\nIf you need to manually populate, use this SQL:\n');
  console.log('---SQL START---');

  const sqlStatements: string[] = [];

  for (const category of DEFAULT_CATEGORIES) {
    const sql = `INSERT INTO categories (id, name, icon, color, description, is_default, created_at, updated_at)
VALUES (${category.id}, '${category.name.replace(/'/g, "''")}', '${category.icon}', '${category.color}', '${category.description?.replace(/'/g, "''") || 'NULL'}', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  description = EXCLUDED.description;`;

    sqlStatements.push(sql);
  }

  console.log(sqlStatements.join('\n\n'));
  console.log('\n---SQL END---');

  console.log('\n✅ Copy and run this SQL in your database client, or');
  console.log('   wait for the categories to be created automatically on first app load.');
}

main().catch(console.error);
