#!/usr/bin/env npx tsx
/**
 * Script to migrate from hardcoded categories to database categories
 * This script:
 * 1. Creates all default categories in the database
 * 2. Updates all merchants to use category_id instead of category string
 */

import { ConnectorConfig, AuthMode, DataConnect } from 'firebase/data-connect';

// Category definitions from the frontend
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
  const { Pool } = await import('pg');

  // Connect to the database
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.log('\nUsage:');
    console.log('  DATABASE_URL="postgresql://user:pass@host:port/db" npx tsx scripts/migrate-categories.ts');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    console.log('🔄 Starting category migration...\n');

    // Step 1: Insert all default categories
    console.log('📥 Inserting default categories...');
    for (const category of DEFAULT_CATEGORIES) {
      try {
        await pool.query(
          `INSERT INTO categories (id, name, icon, color, description, is_default)
           VALUES ($1, $2, $3, $4, $5, true)
           ON CONFLICT (name) DO UPDATE SET
             icon = EXCLUDED.icon,
             color = EXCLUDED.color,
             description = EXCLUDED.description`,
          [category.id, category.name, category.icon, category.color, category.description]
        );
        console.log(`  ✅ ${category.icon} ${category.name}`);
      } catch (error: any) {
        console.log(`  ⚠️  ${category.name} (already exists or error: ${error.message})`);
      }
    }

    // Reset sequence
    await pool.query(`SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories))`);
    console.log('\n✅ Categories inserted successfully\n');

    // Step 2: Create a mapping from category name to category ID
    const categoryMap = new Map<string, number>();
    DEFAULT_CATEGORIES.forEach(cat => {
      categoryMap.set(cat.name, cat.id);
    });

    // Step 3: Update all merchants to use category_id
    console.log('🔄 Migrating merchants to use category_id...');

    const { rows: merchants } = await pool.query(
      'SELECT id, name, category FROM merchants WHERE category IS NOT NULL'
    );

    console.log(`Found ${merchants.length} merchants with categories\n`);

    let updated = 0;
    let notFound = 0;

    for (const merchant of merchants) {
      const categoryId = categoryMap.get(merchant.category);

      if (categoryId) {
        await pool.query(
          'UPDATE merchants SET category_id = $1 WHERE id = $2',
          [categoryId, merchant.id]
        );
        updated++;
        if (updated % 10 === 0) {
          console.log(`  Updated ${updated}/${merchants.length} merchants...`);
        }
      } else {
        console.log(`  ⚠️  Category not found for merchant "${merchant.name}": "${merchant.category}"`);
        notFound++;
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Updated: ${updated} merchants`);
    if (notFound > 0) {
      console.log(`   ⚠️  Not found: ${notFound} merchants (may have custom categories)`);
    }

    // Step 4: Show summary
    console.log('\n📊 Summary:');
    const { rows: categoryCounts } = await pool.query(`
      SELECT c.name, c.icon, COUNT(m.id) as merchant_count
      FROM categories c
      LEFT JOIN merchants m ON m.category_id = c.id
      GROUP BY c.id, c.name, c.icon
      ORDER BY merchant_count DESC
    `);

    categoryCounts.forEach(row => {
      console.log(`  ${row.icon} ${row.name}: ${row.merchant_count} merchants`);
    });

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
