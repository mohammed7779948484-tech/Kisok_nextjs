import { beforeEach, describe, expect, it, vi } from 'vitest';

const context = vi.hoisted(() => ({
  session: null as any,
  publicKey: 'B'.repeat(87),
  client: {
    from: vi.fn(),
    auth: { getClaims: vi.fn() },
  },
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/infrastructure/supabase/auth/server', () => ({
  getTrustedAdminSession: async () => context.session,
}));
vi.mock('@/infrastructure/supabase/client/server-client', () => ({
  getServerSupabaseClient: async () => context.client,
}));
vi.mock('@/lib/env', () => ({
  env: {
    get NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY() {
      return context.publicKey;
    },
  },
}));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn() } }));

import { registerDeviceSubscription, removeDeviceSubscription } from './actions';

const input = {
  endpoint: 'https://fcm.googleapis.com/device',
  keys: { p256dh: 'B'.repeat(87), auth: 'A'.repeat(22) },
};

describe('authenticated device actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    context.session = null;
  });

  it('rejects unauthenticated callers before reading subscriptions', async () => {
    await expect(registerDeviceSubscription(input, 'en')).rejects.toThrow(/active Admin/);
    expect(context.client.from).not.toHaveBeenCalled();
  });

  it('rejects network targets before accessing the table', async () => {
    context.session = { userId: 'admin' };
    await expect(
      registerDeviceSubscription({ ...input, endpoint: 'https://127.0.0.1/' }, 'en'),
    ).rejects.toThrow(/invalid/);
    expect(context.client.from).not.toHaveBeenCalled();
  });

  it('derives device ownership from the verified session', async () => {
    context.session = { userId: 'verified-admin' };
    const insert = vi.fn().mockResolvedValue({ error: null });
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert,
    };
    context.client.from.mockReturnValue(query);
    await registerDeviceSubscription({ ...input, user_id: 'attacker' }, 'en');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'verified-admin', endpoint: input.endpoint }),
    );
  });

  it('returns a sanitized error for conflicting endpoint ownership', async () => {
    context.session = { userId: 'admin' };
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ error: { code: '23505', message: 'secret endpoint' } }),
    };
    context.client.from.mockReturnValue(query);
    await expect(registerDeviceSubscription(input, 'en')).rejects.toThrow(/could not be saved/);
  });

  it('refreshes its own row when two tabs race to register one device', async () => {
    context.session = { userId: 'admin' };
    const updateId = vi.fn().mockResolvedValue({ error: null });
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { id: 'own-device' }, error: null }),
      insert: vi.fn().mockResolvedValue({ error: { code: '23505' } }),
      update: vi.fn().mockReturnValue({ eq: updateId }),
    };
    context.client.from.mockReturnValue(query);
    await registerDeviceSubscription(input, 'en');
    expect(updateId).toHaveBeenCalledWith('id', 'own-device');
    expect(query.update.mock.calls[0][0]).not.toHaveProperty('user_id');
  });

  it('scopes removal to the signed-in user', async () => {
    context.client.auth.getClaims.mockResolvedValue({ data: { claims: { sub: 'admin' } } });
    const eq = vi.fn();
    const query = { delete: vi.fn().mockReturnThis(), eq };
    eq.mockReturnValueOnce(query).mockResolvedValueOnce({ error: null });
    context.client.from.mockReturnValue(query);
    await removeDeviceSubscription(input.endpoint);
    expect(query.eq).toHaveBeenCalledWith('user_id', 'admin');
  });
});
