import { describe, expect, it } from 'vitest';
import type { MessagePayload } from 'firebase/messaging';
import { foregroundNotification, subscriptionsForToken, subscriptionToken } from './push-device';

const phone = { id: 5, endpoint: 'token-phone', keys: { fcmToken: 'token-phone' } };
const laptop = { id: 4, endpoint: 'token-laptop', keys: { fcmToken: 'token-laptop' } };

describe('subscriptionsForToken', () => {
  it('finds only the subscription of this device', () => {
    expect(subscriptionsForToken([laptop, phone], 'token-phone')).toEqual([phone]);
  });

  it('reports this device as unsubscribed when only another device is subscribed', () => {
    expect(subscriptionsForToken([laptop], 'token-phone')).toEqual([]);
  });

  it('matches nothing without a token', () => {
    expect(subscriptionsForToken([laptop, phone], null)).toEqual([]);
    expect(subscriptionsForToken([laptop, phone], '')).toEqual([]);
  });

  it('falls back to the endpoint when keys has no fcmToken, like the sender', () => {
    const legacy = { id: 1, endpoint: 'token-old', keys: {} };
    expect(subscriptionToken(legacy)).toBe('token-old');
    expect(subscriptionsForToken([legacy], 'token-old')).toEqual([legacy]);
  });
});

describe('foregroundNotification', () => {
  it('keeps the sender tag and passes the link to the service worker', () => {
    const payload = {
      notification: { title: 'Food & Dining', body: '80% used' },
      data: { tag: 'budget-alert-1', link: 'https://example.invalid/finance/budgets' },
    } as unknown as MessagePayload;

    expect(foregroundNotification(payload)).toEqual({
      title: 'Food & Dining',
      options: {
        body: '80% used',
        icon: '/logo.svg',
        badge: '/badge-72.png',
        tag: 'budget-alert-1',
        data: { url: 'https://example.invalid/finance/budgets' },
      },
    });
  });

  it('uses fcmOptions.link when data has no link and a default title', () => {
    const payload = { fcmOptions: { link: 'https://example.invalid/x' } } as unknown as MessagePayload;
    const { title, options } = foregroundNotification(payload);
    expect(title).toBe('Personal Dashboard');
    expect(options.data).toEqual({ url: 'https://example.invalid/x' });
  });
});
