#!/usr/bin/env npx tsx

/**
 * Update the Gmail sync state history ID directly in Supabase.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function main() {
  const newHistoryId = process.argv[2];

  if (!newHistoryId || Number.isNaN(Number(newHistoryId))) {
    console.error('Usage: npx tsx scripts/maintenance/update-history-id.ts <history_id>');
    process.exit(1);
  }

  const lastSyncedAt = new Date().toISOString();

  console.log(`Updating Gmail sync state to historyId: ${newHistoryId}`);

  const { error } = await supabase
    .from('gmail_sync_state')
    .upsert({
      id: 1,
      last_history_id: Number.parseInt(newHistoryId, 10),
      last_synced_at: lastSyncedAt,
      watch_expiration: null,
      updated_at: lastSyncedAt,
    });

  if (error) {
    console.error('Failed to update Gmail sync state:', error.message);
    process.exit(1);
  }

  console.log('✓ Successfully updated Gmail sync state');
  console.log(`  History ID: ${newHistoryId}`);
  console.log(`  Last Synced: ${lastSyncedAt}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
