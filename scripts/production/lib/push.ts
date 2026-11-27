/**
 * FCM push to every active subscription. Shared by the payment reminders and the
 * budget alerts. Logs never include emails, amounts or merchants: GitHub Actions
 * logs of this public repo are public.
 *
 * Env vars:
 *   GOOGLE_CLOUD_PROJECT   GCP project ID (Firebase Admin SDK)
 *   FIREBASE_ACCESS_TOKEN  OAuth access token from google-github-actions/auth
 */

import { getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, type Message } from 'firebase-admin/messaging';
import type { SupabaseClient } from '@supabase/supabase-js';
import { deactivateSubscription, getActiveSubscriptions } from '@personal-dashboard/supabase-queries';
import { Logger } from '../../../services/ingestor/src/utils/logger';

export const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://personal-finantial-dashboard.web.app';

/** Android notification channels created by the app (see PushSetup.kt). */
export type PushChannel = 'budget_alerts' | 'payment_reminders';

export interface PushPayload {
  title: string;
  body: string;
  /** Notifications with the same tag replace each other on the device. */
  tag: string;
  link: string;
  /** Android channel, so the owner can mute one kind from Android settings. */
  channel: PushChannel;
  requireInteraction?: boolean;
}

export interface PushResult {
  sent: number;
  failed: number;
  deactivated: number;
}

function ensureFirebase(): void {
  if (getApps().length > 0) return;
  initializeApp({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802',
    credential: {
      getAccessToken: async () => ({
        access_token: process.env.FIREBASE_ACCESS_TOKEN ?? '',
        expires_in: 3600,
      }),
    },
  });
}

const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

/** One FCM message for one device token: web and Android read their own blocks. */
export function buildMessage(token: string, payload: PushPayload): Message {
  return {
    token,
    notification: { title: payload.title, body: payload.body },
    // The web app reads tag and link from data when it is in the foreground,
    // where the FCM SDK does not show the notification itself. The Android app
    // reads the tag from data to pick the tab a tap opens.
    data: { tag: payload.tag, link: payload.link },
    webpush: {
      notification: {
        icon: '/logo.svg',
        badge: '/badge-72.png',
        tag: payload.tag,
        requireInteraction: payload.requireInteraction ?? false,
      },
      fcmOptions: { link: payload.link },
    },
    android: {
      // High priority so budget alerts are not held back by Doze.
      priority: 'high',
      notification: { tag: payload.tag, channelId: payload.channel },
    },
  };
}

export async function sendPushToActiveSubscriptions(
  supabase: SupabaseClient,
  payload: PushPayload,
): Promise<PushResult> {
  ensureFirebase();
  const result: PushResult = { sent: 0, failed: 0, deactivated: 0 };
  const subs = await getActiveSubscriptions(supabase);

  for (const sub of subs) {
    try {
      const fcmToken = sub.keys?.fcmToken || sub.endpoint;
      await getMessaging().send(buildMessage(fcmToken, payload));
      result.sent++;
    } catch (err: any) {
      result.failed++;
      if (INVALID_TOKEN_CODES.has(err?.code)) {
        await deactivateSubscription(supabase, sub.id);
        result.deactivated++;
        Logger.warn('Push subscription deactivated', { event: 'push_token_invalid', subscriptionId: sub.id, tag: payload.tag });
      } else {
        Logger.error('Push send failed', { event: 'push_send_failed', subscriptionId: sub.id, tag: payload.tag, code: err?.code });
      }
    }
  }

  return result;
}
