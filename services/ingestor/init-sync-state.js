// Quick script to initialize gmail_sync_state table
const { initializeApp, getApps } = require('firebase/app');
const { getDataConnect } = require('firebase/data-connect');
const generated = require('./src/generated/index.cjs.js');
const { connectorConfig, updateGmailSyncState } = generated;

async function initSyncState() {
  console.log('Initializing Firebase...');

  if (!getApps().length) {
    initializeApp({
      projectId: 'mail-reader-433802',
    });
  }

  const dataConnect = getDataConnect(connectorConfig);

  // Use the most recent historyId from logs
  const historyId = 12183976;

  console.log(`Setting initial historyId to: ${historyId}`);

  try {
    await updateGmailSyncState(dataConnect, {
      lastHistoryId: historyId,
      lastSyncedAt: new Date().toISOString(),
      watchExpiration: null,
    });

    console.log('✓ Successfully initialized gmail_sync_state');
    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to initialize:', error.message);
    process.exit(1);
  }
}

initSyncState();
