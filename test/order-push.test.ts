import { describe, expect, it, vi } from 'vitest';

import {
  deliverBatch,
  parseWebhook,
  safeEndpoint,
  secretMatches,
} from '../supabase/functions/order-push/core.js';

const event = {
  type: 'INSERT',
  schema: 'public',
  table: 'orders',
  record: {
    id: '12345678-1234-1234-1234-123456789abc',
    display_number: 'ABC234',
    created_at: '2026-10-03T00:00:00Z',
  },
};

describe('order push delivery', () => {
  it('accepts only genuine order INSERT shapes', () => {
    expect(parseWebhook(event)).toEqual(event.record);
    expect(parseWebhook({ ...event, type: 'UPDATE' })).toBeNull();
    expect(parseWebhook({ ...event, table: 'profiles' })).toBeNull();
    expect(parseWebhook({ ...event, schema: 'private' })).toBeNull();
    expect(parseWebhook({ ...event, record: {} })).toBeNull();
    expect(parseWebhook(null)).toBeNull();
  });

  it('rejects private, credential-bearing and attacker-controlled endpoints', () => {
    expect(safeEndpoint('https://fcm.googleapis.com/push/123')).toBe(true);
    expect(safeEndpoint('https://web.push.apple.com/123')).toBe(true);
    expect(safeEndpoint('https://localhost/123')).toBe(false);
    expect(safeEndpoint('http://fcm.googleapis.com/123')).toBe(false);
    expect(safeEndpoint('https://fcm.googleapis.com.attacker.test/123')).toBe(false);
    expect(safeEndpoint('https://admin:secret@fcm.googleapis.com/123')).toBe(false);
    expect(safeEndpoint('https://fcm.googleapis.com:8443/123')).toBe(false);
  });

  it('fails closed for missing or wrong webhook secrets', async () => {
    const secret = 's'.repeat(64);
    expect(await secretMatches(null, secret)).toBe(false);
    expect(await secretMatches(secret, undefined)).toBe(false);
    expect(await secretMatches('wrong', secret)).toBe(false);
    expect(await secretMatches(secret, secret)).toBe(true);
  });

  it('sends to multiple devices with controlled concurrency', async () => {
    let active = 0;
    let maximum = 0;
    const send = vi.fn(async () => {
      active++;
      maximum = Math.max(maximum, active);
      await Promise.resolve();
      active--;
    });
    const subscriptions = Array.from({ length: 12 }, (_, i) => ({
      id: String(i),
      endpoint: `https://fcm.googleapis.com/${i}`,
    }));
    const result = await deliverBatch(subscriptions, 'payload', send, vi.fn(), 3);
    expect(result.sent).toBe(12);
    expect(maximum).toBeLessThanOrEqual(3);
  });

  it.each([404, 410])('cleans up a terminal %i endpoint', async (statusCode) => {
    const device = { id: 'device', endpoint: 'https://fcm.googleapis.com/123' };
    const remove = vi.fn();
    const result = await deliverBatch(
      [device],
      'payload',
      vi.fn().mockRejectedValue({ statusCode }),
      remove,
    );
    expect(result.stale).toBe(1);
    expect(remove).toHaveBeenCalledWith(device);
  });

  it.each([429, 500, 503, undefined])(
    'retains devices on transient %s failures',
    async (statusCode) => {
      const remove = vi.fn();
      const result = await deliverBatch(
        [{ endpoint: 'https://fcm.googleapis.com/123' }],
        'payload',
        vi.fn().mockRejectedValue({ statusCode }),
        remove,
      );
      expect(result.transient).toBe(1);
      expect(remove).not.toHaveBeenCalled();
    },
  );

  it('isolates cleanup failure from successful device delivery', async () => {
    const result = await deliverBatch(
      [
        { endpoint: 'https://fcm.googleapis.com/stale' },
        { endpoint: 'https://fcm.googleapis.com/live' },
      ],
      'payload',
      vi.fn().mockRejectedValueOnce({ statusCode: 410 }).mockResolvedValueOnce(undefined),
      vi.fn().mockRejectedValue(new Error('Database unavailable')),
    );
    expect(result.sent).toBe(1);
    expect(result.cleanupFailed).toBe(1);
  });
});
