import { describe, expect, it } from 'vitest';

import { isPushEndpoint, subscriptionSchema } from './schema';

describe('subscription registration validation', () => {
  it('accepts standard browser keys and validates their encoded length', () => {
    const subscription = {
      endpoint: 'https://fcm.googleapis.com/push/123',
      keys: { p256dh: 'B'.repeat(87), auth: 'A'.repeat(22) },
      expirationTime: null,
    };
    expect(subscriptionSchema.safeParse(subscription).success).toBe(true);
    expect(
      subscriptionSchema.safeParse({ ...subscription, keys: { p256dh: 'bad', auth: 'bad' } }).success,
    ).toBe(false);
  });

  it('rejects arbitrary network targets and URL credentials', () => {
    expect(isPushEndpoint('https://127.0.0.1/push')).toBe(false);
    expect(isPushEndpoint('https://fcm.googleapis.com.attacker.test/push')).toBe(false);
    expect(isPushEndpoint('https://user:pass@fcm.googleapis.com/push')).toBe(false);
    expect(isPushEndpoint('javascript:alert(1)')).toBe(false);
  });
});
