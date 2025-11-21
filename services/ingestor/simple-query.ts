#!/usr/bin/env npx tsx

import { initializeApp, getApps } from 'firebase/app';
import { getDataConnect } from 'firebase/data-connect';

const generated = require('./src/generated/index.cjs.js');
const { connectorConfig, listTransactions } = generated;

async function main() {
  if (!getApps().length) {
    initializeApp({ projectId: 'mail-reader-433802' });
  }

  const dataConnect = getDataConnect(connectorConfig);

  console.log('Consultando transacciones sin filtros...\n');

  try {
    // Get transactions from the past 30 days
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const today = new Date();

    const result = await listTransactions(dataConnect, {
      limit: 10,
      offset: 0,
      startDate: oneMonthAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      provider: null,
      txnType: null,
    });

    const transactions = result.data?.transactions || [];
    console.log(`Found ${transactions.length} transactions\n`);

    if (transactions.length > 0) {
      transactions.forEach((txn: any, i: number) => {
        console.log(`${i + 1}. $${txn.amount} - ${txn.merchantName} (${txn.txnDate})`);
      });
    } else {
      console.log('No transactions found.');
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response?.errors) {
      console.error('GraphQL Errors:', JSON.stringify(error.response.errors, null, 2));
    }
  }
}

main().catch(console.error);
