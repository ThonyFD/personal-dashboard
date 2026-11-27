#!/usr/bin/env tsx
/**
 * Local only: send one test push to ONE push_subscriptions row, to check a device by hand
 * (channel, tag replacement, tap target). Never wire this into GitHub Actions.
 * Prints only "sent" or the FCM error code: no token, email or payload.
 *
 * Usage:
 *   SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=$(gcloud secrets versions access latest --secret supabase-service-role-key --project mail-reader-433802) \
 *   GOOGLE_CLOUD_PROJECT=mail-reader-433802 \
 *   FIREBASE_ACCESS_TOKEN=$(gcloud auth print-access-token) \
 *   npx tsx scripts/production/send-test-push.ts --id <subscriptionId> --kind budget|payment
 */

import { createClient } from '@supabase/supabase-js';
import { getMessaging } from 'firebase-admin/messaging';
import { DASHBOARD_URL, buildMessage, ensureFirebase, type PushPayload } from './lib/push';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function testPayload(kind: string): PushPayload {
  if (kind === 'payment') {
    return {
      title: '🧪 Prueba de pagos',
      body: 'Recordatorio de prueba: un segundo envío reemplaza a este.',
      tag: 'payment-reminder',
      link: `${DASHBOARD_URL}/monthly-control`,
      channel: 'payment_reminders',
    };
  }
  if (kind === 'budget') {
    return {
      title: '🧪 Prueba de presupuesto',
      body: 'Alerta de prueba: cada envío queda aparte.',
      tag: `budget-alert-test-${Math.floor(Date.now() / 1000)}`,
      link: `${DASHBOARD_URL}/finance/budgets`,
      channel: 'budget_alerts',
    };
  }
  throw new Error('--kind must be budget or payment');
}

async function main(): Promise<void> {
  const id = Number(arg('id'));
  if (!Number.isInteger(id) || id <= 0) throw new Error('--id <subscriptionId> is required');
  const payload = testPayload(arg('kind') ?? '');

  const supabase = createClient(process.env.SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.from('push_subscriptions').select('endpoint, keys').eq('id', id).maybeSingle();
  if (error) throw new Error(`Could not read subscription ${id}: ${error.code}`);
  if (!data) throw new Error(`Subscription ${id} not found`);

  const keys = typeof data.keys === 'string' ? JSON.parse(data.keys) : data.keys;
  ensureFirebase();
  try {
    await getMessaging().send(buildMessage(keys?.fcmToken || data.endpoint, payload));
    console.log('sent');
  } catch (err: any) {
    console.log(`failed: ${err?.code ?? 'unknown'}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : 'failed');
  process.exitCode = 1;
});
