#!/usr/bin/env npx tsx

/**
 * Script to update the Gmail sync state history ID
 * This resolves the issue where old messages are being fetched
 * that no longer exist in Gmail
 */

import { initializeApp, getApps } from 'firebase/app';
import { getDataConnect } from 'firebase/data-connect';

// Import from generated SDK
const generated = require('./src/generated/index.cjs.js');
const { connectorConfig, updateGmailSyncState } = generated;

async function main() {
  // Get the new history ID from command line or use the one from Gmail Watch
  const newHistoryId = process.argv[2] || '12199254'; // Latest from Gmail Watch setup

  console.log(`Updating Gmail sync state to historyId: ${newHistoryId}`);

  // Initialize Firebase App
  if (!getApps().length) {
    initializeApp({
      projectId: 'mail-reader-433802',
    });
  }

  // Initialize Data Connect
  const dataConnect = getDataConnect(connectorConfig);

  // Update the sync state
  const lastSyncedAt = new Date().toISOString();

  try {
    await updateGmailSyncState(dataConnect, {
      lastHistoryId: parseInt(newHistoryId, 10),
      lastSyncedAt,
      watchExpiration: null,
    });

    console.log('✓ Successfully updated Gmail sync state');
    console.log(`  History ID: ${newHistoryId}`);
    console.log(`  Last Synced: ${lastSyncedAt}`);
  } catch (error) {
    console.error('✗ Failed to update Gmail sync state:', error);
    process.exit(1);
  }
}

main().catch(console.error);
