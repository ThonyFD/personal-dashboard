import { getDbClient } from './src/database/client';

async function queryDatabase() {
  const client = await getDbClient();

  try {
    // Latest transaction
    const txnResult = await client.query(`
      SELECT
        MAX(transaction_date) as latest_transaction_date,
        COUNT(*) as total_transactions,
        MAX(created_at) as last_created_at
      FROM transactions
    `);
    console.log('\n=== LATEST TRANSACTION INFO ===');
    console.log(txnResult.rows[0]);

    // Recent transactions by date
    const recentResult = await client.query(`
      SELECT
        transaction_date::date as date,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM transactions
      WHERE transaction_date >= NOW() - INTERVAL '30 days'
      GROUP BY transaction_date::date
      ORDER BY date DESC
      LIMIT 15
    `);
    console.log('\n=== LAST 15 DAYS WITH TRANSACTIONS ===');
    console.table(recentResult.rows);

    // Email stats
    const emailResult = await client.query(`
      SELECT
        COUNT(*) as total_emails,
        MAX(received_at) as latest_email_received,
        MAX(created_at) as latest_email_processed
      FROM emails
    `);
    console.log('\n=== EMAIL STATS ===');
    console.log(emailResult.rows[0]);

    // Gmail sync state
    const syncResult = await client.query(`
      SELECT
        last_synced_at,
        history_id,
        created_at
      FROM gmail_sync_state
      ORDER BY last_synced_at DESC
      LIMIT 1
    `);
    console.log('\n=== GMAIL SYNC STATE ===');
    console.log(syncResult.rows[0]);

    // Check recent emails without transactions
    const emailsNoTxnResult = await client.query(`
      SELECT
        e.subject,
        e.sender,
        e.received_at,
        CASE WHEN t.id IS NOT NULL THEN 'Has Transaction' ELSE 'No Transaction' END as status
      FROM emails e
      LEFT JOIN transactions t ON e.id = t.email_id
      WHERE e.received_at >= NOW() - INTERVAL '7 days'
      ORDER BY e.received_at DESC
      LIMIT 20
    `);
    console.log('\n=== RECENT EMAILS (Last 7 days) ===');
    console.table(emailsNoTxnResult.rows);

  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await client.end();
  }
}

queryDatabase();
