import type { MessagePayload } from 'firebase/messaging';

/**
 * Push subscriptions are per device: every browser has its own FCM token. The
 * dashboard checks and removes only the row of the device it runs on, so the
 * phone and the laptop can both stay subscribed.
 */
export interface StoredSubscription {
  id: number;
  endpoint: string;
  keys?: Record<string, string> | null;
}

/** Same rule the sender uses (scripts/production/lib/push.ts). */
export function subscriptionToken(sub: StoredSubscription): string {
  return sub.keys?.fcmToken || sub.endpoint;
}

export function subscriptionsForToken<T extends StoredSubscription>(
  subs: T[],
  token: string | null | undefined,
): T[] {
  if (!token) return [];
  return subs.filter((sub) => subscriptionToken(sub) === token);
}

export interface ForegroundNotification {
  title: string;
  options: NotificationOptions;
}

/**
 * While the page has focus FCM hands the message to the page and shows nothing.
 * The sender puts tag and link in data, so a budget alert keeps its own tag and
 * never replaces a payment reminder. The service worker opens data.url on click.
 */
export function foregroundNotification(payload: MessagePayload): ForegroundNotification {
  const link = payload.data?.link ?? payload.fcmOptions?.link;
  return {
    title: payload.notification?.title || 'Personal Dashboard',
    options: {
      body: payload.notification?.body,
      icon: '/logo.svg',
      badge: '/badge-72.png',
      tag: payload.data?.tag,
      data: link ? { url: link } : undefined,
    },
  };
}
