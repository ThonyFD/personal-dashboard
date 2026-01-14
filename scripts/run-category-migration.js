#!/usr/bin/env node
/**
 * Run category migration directly via Cloud SQL
 * No psql client required - uses Node.js pg library
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'mail-reader-433802';
const INSTANCE_CONNECTION_NAME = 'mail-reader-433802:us-central1:personal-dashboard-fdc';
const DATABASE = 'fdcdb_dc';
const USER = 'postgres';

async function runMigration() {
  console.log('🚀 Starting Category Integrity Migration...\n');

  // Check if running in Cloud Run or locally
  const isCloudRun = process.env.K_SERVICE !== undefined;

  const config = {
    user: USER,
    database: DATABASE,
    // Use Unix socket for Cloud SQL
    host: isCloudRun
      ? `/cloudsql/${INSTANCE_CONNECTION_NAME}`
      : '127.0.0.1', // Assumes Cloud SQL Proxy is running locally
    port: isCloudRun ? undefined : 5432,
  };

  const client = new Client(config);

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Populate categories
    console.log('📝 Step 1: Populating categories table...');
    const populateSQL = fs.readFileSync(
      path.join(__dirname, 'populate-categories.sql'),
      'utf8'
    );
    await client.query(populateSQL);
    console.log('✅ Categories populated successfully\n');

    // Step 2: Migrate merchant categories
    console.log('📝 Step 2: Migrating existing merchant categories...');
    const migrateSQL = fs.readFileSync(
      path.join(__dirname, 'migrate-merchant-categories.sql'),
      'utf8'
    );
    const result = await client.query(migrateSQL);
    console.log('✅ Merchant categories migrated successfully');

    // Show the verification results
    if (result.rows && result.rows.length > 0) {
      console.log('\nCategory distribution:');
      console.table(result.rows);
    }
    console.log();

    // Step 3: Add foreign key constraint
    console.log('📝 Step 3: Adding foreign key constraint...');
    const constraintSQL = fs.readFileSync(
      path.join(__dirname, 'add-category-fk-constraint.sql'),
      'utf8'
    );
    await client.query(constraintSQL);
    console.log('✅ Foreign key constraint added successfully\n');

    console.log('🎉 Category migration completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Deploy Firebase Data Connect: firebase deploy --only dataconnect');
    console.log('2. Deploy Ingestor service: cd services/ingestor && npm run build && gcloud run deploy ingestor ...');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
