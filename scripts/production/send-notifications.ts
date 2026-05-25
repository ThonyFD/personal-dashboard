#!/usr/bin/env tsx
/**
 * Send FCM push notifications for pending payments.
 * Run daily via GitHub Actions (same schedule as sync).
 *
 * Env vars required:
 *   GOOGLE_CLOUD_PROJECT  — GCP project ID (for Firebase Admin SDK)
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import {
  getPendingPaymentsNextDays,
  getActiveSubscriptions,
  deactivateSubscription,
  type PendingPayment,
} from '@personal-dashboard/supabase-queries';

const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { persistSession: false } },
);

initializeApp({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802',
  credential: {
    getAccessToken: async () => ({
      access_token: process.env.FIREBASE_ACCESS_TOKEN ?? '',
      expires_in: 3600,
    }),
  },
});

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
    console.log('✓ No pending payments — nothing to notify');
    return;
  }

  const { title, body } = buildNotificationText(payments);
  const totalAmount = payments.reduce((s, p) => s + p.amount, 0);

  const subs = await getActiveSubscriptions(supabase);

  if (subs.length === 0) {
    console.log('✓ No active subscriptions');
    return;
  }

  let sent = 0, failed = 0;

  for (const sub of subs) {
    try {
      const fcmToken = sub.keys.fcmToken || sub.endpoint;

      await getMessaging().send({
        token: fcmToken,
        notification: { title, body },
        webpush: {
          notification: { icon: '/icon-192.png', tag: 'payment-reminder', requireInteraction: true },
          fcmOptions: { link: 'https://personal-finantial-dashboard.web.app/monthly-control' },
        },
      });

      console.log(`  ✓ Sent to ${sub.user_email}`);
      sent++;
    } catch (err: any) {
      if (
        err.code === 'messaging/invalid-registration-token' ||
        err.code === 'messaging/registration-token-not-registered'
      ) {
        await deactivateSubscription(supabase, sub.id);
        console.log(`  ⊘ Invalid token deactivated (${sub.user_email})`);
      } else {
        console.error(`  ✗ Failed (${sub.user_email}):`, err.message);
      }
      failed++;
    }
  }

  console.log(`\n✅ Done — sent: ${sent}, failed: ${failed}, payments: ${payments.length}, amount: $${totalAmount.toFixed(2)}`);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  run().catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}
