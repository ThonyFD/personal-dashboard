#!/usr/bin/env tsx
/**
 * Send FCM push notifications for pending payments.
 * Run daily via GitHub Actions (same schedule as sync).
 *
 * Env vars required:
 *   GOOGLE_CLOUD_PROJECT : GCP project ID (for Firebase Admin SDK)
 *   FIREBASE_ACCESS_TOKEN: OAuth access token from google-github-actions/auth
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import {
  getPendingPaymentsNextDays,
  type PendingPayment,
} from '@personal-dashboard/supabase-queries';
import { DASHBOARD_URL, sendPushToActiveSubscriptions } from './lib/push';

const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { persistSession: false } },
);

function buildNotificationText(payments: PendingPayment[]): { title: string; body: string } {
  const totalAmount = payments.reduce((s, p) => s + p.amount, 0);
  const title = `💰 ${payments.length} pago${payments.length > 1 ? 's' : ''} pendiente${payments.length > 1 ? 's' : ''}`;

  const byDay = new Map<number, PendingPayment[]>();
  for (const p of payments) {
    const list = byDay.get(p.days_ahead) ?? [];
    list.push(p);
    byDay.set(p.days_ahead, list);
  }

  let body = `Total: $${totalAmount.toFixed(2)}\n\n`;
  for (const [daysAhead, group] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
    const label = daysAhead === 0 ? 'Hoy' : daysAhead === 1 ? 'Mañana'
      : new Date(group[0].due_date).toLocaleDateString('es-PA', { month: 'short', day: 'numeric' });
    const dayTotal = group.reduce((s, p) => s + p.amount, 0);
    body += `${label}: ${group.length} pago${group.length > 1 ? 's' : ''} ($${dayTotal.toFixed(2)})\n`;
  }
  body += '\nToca para ver detalles';

  return { title, body };
}

async function run(): Promise<void> {
  console.log('🔔 Sending payment notifications...');

  const payments = await getPendingPaymentsNextDays(supabase, 4);

  if (payments.length === 0) {
    console.log('✓ No pending payments, nothing to notify');
    return;
  }

  const { title, body } = buildNotificationText(payments);

  const result = await sendPushToActiveSubscriptions(supabase, {
    title,
    body,
    tag: 'payment-reminder',
    link: `${DASHBOARD_URL}/monthly-control`,
    requireInteraction: true,
  });

  // Counts only: these logs are public (public repo), so no emails or amounts.
  console.log(`\n✅ Done. sent: ${result.sent}, failed: ${result.failed}, deactivated: ${result.deactivated}, payments: ${payments.length}`);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  run().catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}
