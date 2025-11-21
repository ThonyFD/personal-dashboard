#!/usr/bin/env npx tsx

/**
 * Verify transactions were processed successfully
 */

import { initializeApp, getApps } from 'firebase/app';
import { getDataConnect } from 'firebase/data-connect';

const generated = require('./src/generated/index.cjs.js');
const { connectorConfig, listTransactions } = generated;

async function main() {
  if (!getApps().length) {
    initializeApp({ projectId: 'mail-reader-433802' });
  }

  const dataConnect = getDataConnect(connectorConfig);

  console.log('\n📊 Verificando transacciones procesadas...\n');

  try {
    // Get last week's transactions
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const today = new Date();

    const result = await listTransactions(dataConnect, {
      limit: 20,
      offset: 0,
      startDate: oneWeekAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      provider: null,
      txnType: null,
    });

    const transactions = result.data?.transactions || [];

    console.log('━'.repeat(80));
    console.log('✓ TRANSACCIONES DE LOS ÚLTIMOS 7 DÍAS (primeras 20):');
    console.log('━'.repeat(80));
    console.log('');

    if (transactions.length === 0) {
      console.log('⚠️  No se encontraron transacciones.');
      console.log('   El backfill puede estar aún ejecutándose o no hay transacciones bancarias.\n');
    } else {
      console.log('FECHA       | MONTO      | MERCHANT                      | BANCO    | TIPO');
      console.log('─'.repeat(80));

      let totalAmount = 0;
      const providerCounts: Record<string, number> = {};

      transactions.forEach((txn: any) => {
        const date = new Date(txn.txnDate).toLocaleDateString('es-PA');
        const amount = `$${txn.amount.toFixed(2)}`;
        const merchant = (txn.merchantName || 'N/A').substring(0, 28).padEnd(28);
        const provider = (txn.provider || 'N/A').toUpperCase().padEnd(8);
        const type = txn.txnType === 'DEBIT' ? '💳 Débito' : '💰 Crédito';

        console.log(`${date} | ${amount.padEnd(10)} | ${merchant} | ${provider} | ${type}`);

        totalAmount += txn.amount;
        providerCounts[txn.provider] = (providerCounts[txn.provider] || 0) + 1;
      });

      console.log('─'.repeat(80));
      console.log('');
      console.log(`📈 RESUMEN:`);
      console.log(`   Total transacciones mostradas: ${transactions.length}`);
      console.log(`   Total en montos: $${totalAmount.toFixed(2)}`);
      console.log(`   Proveedores:`);

      Object.entries(providerCounts).forEach(([provider, count]) => {
        console.log(`      ${provider.toUpperCase()}: ${count} transacciones`);
      });

      console.log('');
      console.log('━'.repeat(80));
      console.log('✓ Sistema funcionando correctamente');
      console.log('  Abre el dashboard web para ver todas las transacciones.\n');
    }

  } catch (error: any) {
    console.error('✗ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
}

main().catch(console.error);
