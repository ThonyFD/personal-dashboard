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

import * as admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { persistSession: false } }
);

admin.initializeApp({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802',
});

interface PendingPayment {
  id: number;
  description: string;
  amount: number;
}

async function getPendingPayments(): Promise<{ label: string; payments: PendingPayment[] }[]> {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Panama' }));
  const results: { label: string; payments: PendingPayment[] }[] = [];

  for (let i = 0; i <= 3; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);

    const { data, error } = await supabase
      .from('manual_transactions')
      .select('id, description, amount')
      .eq('year', d.getFullYear())
      .eq('month', d.getMonth() + 1)
      .eq('day', d.getDate())
      .eq('is_paid', false);

    if (error) throw error;
    if (!data || data.length === 0) continue;

    const label = i === 0 ? 'Hoy' : i === 1 ? 'Mañana'
      : d.toLocaleDateString('es-PA', { month: 'short', day: 'numeric' });

    results.push({ label, payments: data.map((r: any) => ({ id: r.id, description: r.description, amount: Number(r.amount) })) });
  }

  return results;
}

async function run(): Promise<void> {
  console.log('🔔 Sending payment notifications...');

  const pendingDays = await getPendingPayments();

  if (pendingDays.length === 0) {
    console.log('✓ No pending payments — nothing to notify');
    return;
  }

  const totalPayments = pendingDays.reduce((s, d) => s + d.payments.length, 0);
  const totalAmount = pendingDays.reduce((s, d) => s + d.payments.reduce((ss, p) => ss + p.amount, 0), 0);

  const title = `💰 ${totalPayments} pago${totalPayments > 1 ? 's' : ''} pendiente${totalPayments > 1 ? 's' : ''}`;
  let body = `Total: $${totalAmount.toFixed(2)}\n\n`;
  pendingDays.forEach(d => {
    const dayTotal = d.payments.reduce((s, p) => s + p.amount, 0);
    body += `${d.label}: ${d.payments.length} pago${d.payments.length > 1 ? 's' : ''} ($${dayTotal.toFixed(2)})\n`;
  });
  body += '\nToca para ver detalles';

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, user_email, keys')
    .eq('is_active', true);

  if (error) throw error;
  if (!subs || subs.length === 0) {
    console.log('✓ No active subscriptions');
    return;
  }

  let sent = 0, failed = 0;

  for (const sub of subs) {
    try {
      const keys = typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys;
      const fcmToken = keys.fcmToken || sub.endpoint;

      await admin.messaging().send({
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
      if (err.code === 'messaging/invalid-registration-token' ||
          err.code === 'messaging/registration-token-not-registered') {
        await supabase.from('push_subscriptions').update({ is_active: false }).eq('id', sub.id);
        console.log(`  ⊘ Invalid token deactivated (${sub.user_email})`);
      } else {
        console.error(`  ✗ Failed (${sub.user_email}):`, err.message);
      }
      failed++;
    }
  }

  console.log(`\n✅ Done — sent: ${sent}, failed: ${failed}, payments: ${totalPayments}, amount: $${totalAmount.toFixed(2)}`);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  run().catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}
