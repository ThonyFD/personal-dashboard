#!/usr/bin/env npx tsx
/**
 * Backfill categories for existing merchants in the database
 * This script reads all merchants with NULL categories and assigns them
 * an auto-categorized value based on their name.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getDataConnect } from 'firebase/data-connect';

// Import from generated SDK
const path = require('path');
const generatedPath = path.resolve(__dirname, '../dataconnect/generated/esm/index.esm.js');
const {
  connectorConfig,
  listMerchants,
  updateMerchantCategory,
} = require(generatedPath);

// Auto-categorization function (same as ingestor and web)
function autoCategorizeMerchant(merchantName: string): string {
  const name = merchantName.toUpperCase();

  // Food & Dining
  if (
    name.includes('RESTAURANT') ||
    name.includes('COFFEE') ||
    name.includes('CAFE') ||
    name.includes('PIZZA') ||
    name.includes('BURGER') ||
    name.includes('FOOD') ||
    name.includes('MCDONALD') ||
    name.includes('KFC') ||
    name.includes('SUBWAY') ||
    name.includes('STARBUCKS') ||
    name.includes('DUNKIN') ||
    name.includes('WENDYS') ||
    name.includes('TACO') ||
    name.includes('SUSHI') ||
    name.includes('GRILL') ||
    name.includes('BISTRO') ||
    name.includes('DINER') ||
    name.includes('BAKERY') ||
    name.includes('BAR') ||
    name.includes('PUB') ||
    name.includes('GEISHA') ||
    name.includes('LOTUS HOUSE')
  ) {
    return 'Food & Dining';
  }

  // Groceries
  if (
    name.includes('SUPER') ||
    name.includes('MARKET') ||
    name.includes('GROCERY') ||
    name.includes('WALMART') ||
    name.includes('TARGET') ||
    name.includes('COSTCO') ||
    name.includes('RIBA SMITH') ||
    name.includes('EL REY') ||
    name.includes('XTRA')
  ) {
    return 'Groceries';
  }

  // Transportation
  if (
    name.includes('UBER') ||
    name.includes('LYFT') ||
    name.includes('TAXI') ||
    name.includes('GAS') ||
    name.includes('FUEL') ||
    name.includes('PARKING') ||
    name.includes('TOLL') ||
    name.includes('METRO') ||
    name.includes('BUS') ||
    name.includes('CABIFY') ||
    name.includes('SHELL') ||
    name.includes('CHEVRON') ||
    name.includes('PUMA ENERGY')
  ) {
    return 'Transportation';
  }

  // Entertainment
  if (
    name.includes('NETFLIX') ||
    name.includes('SPOTIFY') ||
    name.includes('HULU') ||
    name.includes('DISNEY') ||
    name.includes('HBO') ||
    name.includes('PRIME VIDEO') ||
    name.includes('CINEMA') ||
    name.includes('MOVIE') ||
    name.includes('THEATER') ||
    name.includes('PLAYSTATION') ||
    name.includes('XBOX') ||
    name.includes('NINTENDO') ||
    name.includes('STEAM') ||
    name.includes('GAME')
  ) {
    return 'Entertainment';
  }

  // Shopping
  if (
    name.includes('AMAZON') ||
    name.includes('EBAY') ||
    name.includes('STORE') ||
    name.includes('SHOP') ||
    name.includes('RETAIL') ||
    name.includes('CLOTHING') ||
    name.includes('FASHION') ||
    name.includes('NIKE') ||
    name.includes('ADIDAS') ||
    name.includes('ZARA') ||
    name.includes('H&M')
  ) {
    return 'Shopping';
  }

  // Bills & Utilities
  if (
    name.includes('ELECTRIC') ||
    name.includes('WATER') ||
    name.includes('INTERNET') ||
    name.includes('PHONE') ||
    name.includes('CABLE') ||
    name.includes('UTILITY') ||
    name.includes('CWP') ||
    name.includes('AES') ||
    name.includes('IDAAN')
  ) {
    return 'Bills & Utilities';
  }

  // Healthcare
  if (
    name.includes('HOSPITAL') ||
    name.includes('CLINIC') ||
    name.includes('PHARMACY') ||
    name.includes('DOCTOR') ||
    name.includes('MEDICAL') ||
    name.includes('HEALTH') ||
    name.includes('DENTAL') ||
    name.includes('CVS') ||
    name.includes('WALGREENS') ||
    name.includes('FARMACIAS')
  ) {
    return 'Healthcare';
  }

  // Travel
  if (
    name.includes('HOTEL') ||
    name.includes('AIRLINE') ||
    name.includes('FLIGHT') ||
    name.includes('AIRBNB') ||
    name.includes('BOOKING') ||
    name.includes('EXPEDIA') ||
    name.includes('TRAVEL') ||
    name.includes('RESORT') ||
    name.includes('COPA AIRLINES') ||
    name.includes('AVIANCA')
  ) {
    return 'Travel';
  }

  // Education
  if (
    name.includes('SCHOOL') ||
    name.includes('UNIVERSITY') ||
    name.includes('COLLEGE') ||
    name.includes('EDUCATION') ||
    name.includes('COURSE') ||
    name.includes('TUITION') ||
    name.includes('UDEMY') ||
    name.includes('COURSERA')
  ) {
    return 'Education';
  }

  // Investment
  if (
    name.includes('ADMIRAL') ||
    name.includes('MARKETS') ||
    name.includes('TRADING') ||
    name.includes('BROKER') ||
    name.includes('INVEST') ||
    name.includes('SECURITIES') ||
    name.includes('STOCK') ||
    name.includes('CRYPTO') ||
    name.includes('BINANCE') ||
    name.includes('COINBASE') ||
    name.includes('ETORO') ||
    name.includes('ROBINHOOD') ||
    name.includes('FIDELITY')
  ) {
    return 'Investment';
  }

  // Subscriptions
  if (
    name.includes('SUBSCRIPTION') ||
    name.includes('MONTHLY') ||
    name.includes('MEMBERSHIP')
  ) {
    return 'Subscriptions';
  }

  // Transfers
  if (
    name.includes('TRANSFER') ||
    name.includes('PAYMENT') ||
    name.includes('YAPPY') ||
    name.includes('NEQUI') ||
    name.includes('TRANSFIYA')
  ) {
    return 'Transfers';
  }

  // Services (general services)
  if (
    name.includes('SERVICE') ||
    name.includes('REPAIR') ||
    name.includes('CLEANING') ||
    name.includes('SALON') ||
    name.includes('SPA')
  ) {
    return 'Services';
  }

  return 'Other';
}

async function main() {
  console.log('🔄 Starting merchant category backfill...');

  // Initialize Firebase
  if (!getApps().length) {
    initializeApp({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802',
    });
  }

  const dataConnect = getDataConnect(connectorConfig);

  // Fetch all merchants
  console.log('📥 Fetching merchants...');
  const result = await listMerchants(dataConnect, { limit: 10000 });
  const merchants = result.data.merchants || [];

  console.log(`Found ${merchants.length} merchants`);

  // Filter merchants with NULL category
  const merchantsWithoutCategory = merchants.filter((m: any) => !m.category);
  console.log(`${merchantsWithoutCategory.length} merchants need categorization`);

  if (merchantsWithoutCategory.length === 0) {
    console.log('✅ All merchants already have categories!');
    return;
  }

  // Update each merchant
  let updated = 0;
  let failed = 0;

  for (const merchant of merchantsWithoutCategory) {
    try {
      const category = autoCategorizeMerchant(merchant.name);
      console.log(`📝 ${merchant.name} -> ${category}`);

      await updateMerchantCategory(dataConnect, {
        id: merchant.id,
        category: category,
      });

      updated++;
    } catch (error) {
      console.error(`❌ Failed to update ${merchant.name}:`, error);
      failed++;
    }
  }

  console.log(`\n✅ Done! Updated: ${updated}, Failed: ${failed}`);
}

main().catch(console.error);
