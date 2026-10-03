import { describe, expect, it, vi } from 'vitest';

import { disableSubscription, enableSubscription } from './subscription';

const subscription = () => ({
  endpoint: 'https://fcm.googleapis.com/test',
  toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/test', keys: {} }),
  unsubscribe: vi.fn().mockResolvedValue(true),
});

describe('device subscriptions', () => {
  it('rejects denied permission without subscribing', async () => {
    const subscribe = vi.fn();
    await expect(
      enableSubscription({
        permission: 'denied',
        requestPermission: vi.fn(),
        manager: { getSubscription: vi.fn(), subscribe },
        publicKey: 'key',
        persist: vi.fn(),
      }),
    ).rejects.toThrow(/blocked/i);
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('persists an existing subscription without duplicating it', async () => {
    const existing = subscription();
    const subscribe = vi.fn();
    const persist = vi.fn().mockResolvedValue(undefined);
    await enableSubscription({
      permission: 'granted',
      requestPermission: vi.fn(),
      manager: { getSubscription: vi.fn().mockResolvedValue(existing), subscribe },
      publicKey: 'key',
      persist,
    });
    expect(subscribe).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalledWith(existing.toJSON());
  });

  it('requests permission on explicit enable and subscribes using VAPID', async () => {
    const created = subscription();
    const requestPermission = vi.fn().mockResolvedValue('granted');
    const subscribe = vi.fn().mockResolvedValue(created);
    await enableSubscription({
      permission: 'default',
      requestPermission,
      manager: { getSubscription: vi.fn().mockResolvedValue(null), subscribe },
      publicKey: 'AQID',
      persist: vi.fn().mockResolvedValue(undefined),
    });
    expect(requestPermission).toHaveBeenCalledOnce();
    expect(subscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array),
      }),
    );
  });

  it('rolls back a newly created browser subscription on server failure', async () => {
    const created = subscription();
    await expect(
      enableSubscription({
        permission: 'granted',
        requestPermission: vi.fn(),
        manager: {
          getSubscription: vi.fn().mockResolvedValue(null),
          subscribe: vi.fn().mockResolvedValue(created),
        },
        publicKey: 'AQID',
        persist: vi.fn().mockRejectedValue(new Error('Persistence failed')),
      }),
    ).rejects.toThrow('Persistence failed');
    expect(created.unsubscribe).toHaveBeenCalledOnce();
  });

  it('unsubscribes at the provider and removes server registration', async () => {
    const existing = subscription();
    const remove = vi.fn().mockResolvedValue(undefined);
    await disableSubscription(existing, remove);
    expect(existing.unsubscribe).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith(existing.endpoint);
  });

  it('keeps the error visible when provider unsubscribe fails', async () => {
    const existing = subscription();
    existing.unsubscribe.mockRejectedValue(new Error('Offline'));
    await expect(disableSubscription(existing, vi.fn())).rejects.toThrow('Offline');
  });
});
