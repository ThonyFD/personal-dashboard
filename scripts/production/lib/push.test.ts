import { describe, expect, it } from 'vitest';
import { buildMessage } from './push';

const payload = {
  title: 'T',
  body: 'B',
  tag: 'budget-alert-7',
  link: 'https://example.test/finance/budgets',
  channel: 'budget_alerts' as const,
};

describe('buildMessage', () => {
  it('keeps the web payload as it was', () => {
    const m = buildMessage('tok', payload) as any;
    expect(m.token).toBe('tok');
    expect(m.notification).toEqual({ title: 'T', body: 'B' });
    expect(m.data).toEqual({ tag: 'budget-alert-7', link: 'https://example.test/finance/budgets' });
    expect(m.webpush).toEqual({
      notification: { icon: '/logo.svg', badge: '/badge-72.png', tag: 'budget-alert-7', requireInteraction: false },
      fcmOptions: { link: 'https://example.test/finance/budgets' },
    });
  });

  it('adds an android block with tag, channel and high priority', () => {
    const m = buildMessage('tok', {
      ...payload,
      tag: 'payment-reminder',
      channel: 'payment_reminders',
      requireInteraction: true,
    }) as any;
    expect(m.android).toEqual({
      priority: 'high',
      notification: { tag: 'payment-reminder', channelId: 'payment_reminders' },
    });
    expect(m.webpush.notification.requireInteraction).toBe(true);
  });
});
