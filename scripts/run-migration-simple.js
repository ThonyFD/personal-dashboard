#!/usr/bin/env node
/**
 * Simple migration script using direct SQL execution
 * Reads SQL files and prints them for manual execution
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Category Integrity Migration SQL\n');
console.log('Copy and paste each SQL block into your database client:\n');
console.log('='.repeat(80));

// Step 1
console.log('\n📝 STEP 1: Populate Categories\n');
const populateSQL = fs.readFileSync(
  path.join(__dirname, 'populate-categories.sql'),
  'utf8'
);
console.log(populateSQL);
console.log('='.repeat(80));

// Step 2
console.log('\n📝 STEP 2: Migrate Merchant Categories\n');
const migrateSQL = fs.readFileSync(
  path.join(__dirname, 'migrate-merchant-categories.sql'),
  'utf8'
);
console.log(migrateSQL);
console.log('='.repeat(80));

// Step 3
console.log('\n📝 STEP 3: Add Foreign Key Constraint\n');
const constraintSQL = fs.readFileSync(
  path.join(__dirname, 'add-category-fk-constraint.sql'),
  'utf8'
);
console.log(constraintSQL);
console.log('='.repeat(80));

console.log('\n✅ Execute each SQL block above in your PostgreSQL client');
console.log('\nAlternative: Use the Firebase Data Connect SQL editor or Cloud Console');
