#!/usr/bin/env npx tsx

/**
 * Quick script to check database status using Data Connect queries
 */

import { initializeApp, getApps } from 'firebase/app';
import { getDataConnect } from 'firebase/data-connect';

const generated = require('./src/generated/index.cjs.js');
const { connectorConfig, listRecentTransactions } = generated;

async function main() {
  if (!getApps().length) {
    initializeApp({ projectId: 'mail-reader-433802' });
  }

  const dataConnect = getDataConnect(connectorConfig);

  console.log('\n📊 Verificando estado de la base de datos...\n');

  try {
    // Get recent transactions
    const result = await listRecentTransactions(dataConnect, {
      limit: 10,
    });

    const transactions = result.data?.transactions || [];

    console.log('━'.repeat(70));
    console.log('✓ CONEXIÓN EXITOSA - Últimas 10 transacciones:');
    console.log('━'.repeat(70));

    if (transactions.length === 0) {
      console.log('\n⚠️  No se encontraron transacciones en la base de datos.');
      console.log('   Esto podría significar que el backfill aún no ha completado.\n');
    } else {
      console.log('');
      transactions.forEach((txn: any, index: number) => {
        const date = new Date(txn.txnDate).toLocaleDateString('es-PA');
        const amount = `$${txn.amount.toFixed(2)}`;
        const merchant = txn.merchantName || 'N/A';
        const provider = txn.provider || 'N/A';

        console.log(`${index + 1}. ${date} | ${amount.padEnd(10)} | ${merchant.substring(0, 30).padEnd(30)} | ${provider.toUpperCase()}`);
      });
      console.log('');
      console.log('━'.repeat(70));
      console.log(`\n✓ Sistema funcionando correctamente - ${transactions.length} transacciones mostradas`);
      console.log('  Para ver todas las transacciones, abre el dashboard web.\n');
    }

  } catch (error: any) {
    console.error('✗ Error al consultar la base de datos:', error.message);
    console.error('\nPosible causa: El query "listRecentTransactions" no está disponible.');
    console.error('Verifica que el conector de Data Connect esté desplegado correctamente.\n');
  }
}

main().catch(console.error);
