import { beforeEach, describe, expect, it, vi } from 'vitest';

const context = vi.hoisted(() => ({
  listener: null as any,
  clear: vi.fn(),
  unsubscribe: vi.fn(),
}));
vi.mock('@/features/admin-pwa/lib/device', () => ({ clearLocalDevice: context.clear }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn() } }));
vi.mock('../client/browser-client', () => ({
  getBrowserSupabaseClient: () => ({
    auth: {
      onAuthStateChange: (listener: unknown) => {
        context.listener = listener;
        return { data: { subscription: { unsubscribe: context.unsubscribe } } };
      },
    },
  }),
}));

import { watchPushSession } from './push-session';

describe('push authentication lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    context.clear.mockResolvedValue(undefined);
  });

  it('invalidates device capability after explicit sign out', () => {
    watchPushSession();
    context.listener('SIGNED_OUT', null);
    expect(context.clear).toHaveBeenCalledOnce();
  });

  it('cleans a previous capability when opening with an expired session', () => {
    watchPushSession();
    context.listener('INITIAL_SESSION', null);
    expect(context.clear).toHaveBeenCalledOnce();
  });

  it('preserves the capability for a valid session and removes the listener on teardown', () => {
    const cleanup = watchPushSession();
    context.listener('INITIAL_SESSION', { user: { id: 'admin' } });
    context.listener('SIGNED_IN', { user: { id: 'admin' } });
    context.listener('TOKEN_REFRESHED', { user: { id: 'admin' } });
    expect(context.clear).not.toHaveBeenCalled();
    cleanup();
    expect(context.unsubscribe).toHaveBeenCalledOnce();
  });
});
