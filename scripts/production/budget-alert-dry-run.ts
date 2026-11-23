#!/usr/bin/env tsx
/**
 * Dry run of the budget alerts: prints the push each transaction would get,
 * without claiming budget_alert_log and without sending anything.
 *
 * Run it on your machine only, never in GitHub Actions: the output has real
 * merchants and amounts, and Actions logs of this public repo are public.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/production/budget-alert-dry-run.ts <transactionId> [<transactionId> ...]
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { processBudgetAlerts, supabaseBudgetAlertDeps } from './budget-alerts';

async function main(): Promise<void> {
  const ids = process.argv.slice(2).map((arg) => Number.parseInt(arg, 10));
  if (ids.length === 0 || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    console.error('Usage: budget-alert-dry-run.ts <transactionId> [<transactionId> ...]');
    process.exit(2);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(2);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const outcomes = await processBudgetAlerts(ids, supabaseBudgetAlertDeps(supabase), { dryRun: true });

  for (const outcome of outcomes) {
    console.log(`\n#${outcome.transactionId}`);
    if (outcome.status === 'dry_run') {
      console.log(`  rules:  ${outcome.rules.join(', ')}${outcome.alreadySent ? '  (already alerted before)' : ''}`);
      console.log(`  title:  ${outcome.title}`);
      console.log(`  body:   ${outcome.body.replaceAll('\n', '\n          ')}`);
    } else {
      console.log(`  ${outcome.status}: ${'reason' in outcome ? outcome.reason : ''}`);
    }
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
