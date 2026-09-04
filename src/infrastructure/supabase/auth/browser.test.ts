import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({ getBrowserSupabaseClient: vi.fn() }));

vi.mock('../client/browser-client', () => ({
  getBrowserSupabaseClient: testContext.getBrowserSupabaseClient,
}));

import { signOutCurrentUser } from './browser';

describe('signOutCurrentUser', () => {
  it('throws the Supabase error when signOut resolves with an error object', async () => {
    const authError = { name: 'AuthApiError', message: 'Failed to sign out', status: 500 };
    testContext.getBrowserSupabaseClient.mockReturnValue({
      auth: { signOut: vi.fn().mockResolvedValue({ error: authError }) },
    });

    await expect(signOutCurrentUser()).rejects.toBe(authError);
  });

  it('resolves without throwing when signOut succeeds', async () => {
    testContext.getBrowserSupabaseClient.mockReturnValue({
      auth: { signOut: vi.fn().mockResolvedValue({ error: null }) },
    });

    await expect(signOutCurrentUser()).resolves.toBeUndefined();
  });

  it('does nothing when no browser client is configured', async () => {
    testContext.getBrowserSupabaseClient.mockReturnValue(null);

    await expect(signOutCurrentUser()).resolves.toBeUndefined();
  });
});
