import { describe, expect, it, vi } from 'vitest';

import { assertLocalApiUrl, seedLocalAuthUser } from './local-auth-seed';

const spec = {
  email: 'admin@kiosk.local',
  password: 'KioskLocalAdmin123!',
  displayName: 'Local Admin',
  role: 'admin' as const,
};

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 500) {
  return { ok, status, json: async () => body } as Response;
}

describe('assertLocalApiUrl', () => {
  it('accepts 127.0.0.1 and localhost', () => {
    expect(() => assertLocalApiUrl('http://127.0.0.1:54321')).not.toThrow();
    expect(() => assertLocalApiUrl('http://localhost:54321')).not.toThrow();
  });

  it('refuses a non-local API URL', () => {
    expect(() => assertLocalApiUrl('https://lccplcswursecygwpltj.supabase.co')).toThrow(
      'Refusing to seed Auth because API_URL is not local',
    );
  });
});

describe('seedLocalAuthUser', () => {
  it('creates a new Auth user with the intended password when none exists', async () => {
    const calls: Array<{ url: string; method: string | undefined }> = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method });
      if (url.includes('/auth/v1/admin/users?')) return jsonResponse({ users: [] });
      if (url.endsWith('/auth/v1/admin/users')) return jsonResponse({ id: 'new-user-id' });
      if (url.includes('/rest/v1/profiles')) return jsonResponse({});
      throw new Error(`Unexpected URL in test: ${url}`);
    });

    const result = await seedLocalAuthUser(
      fetchImpl,
      'http://127.0.0.1:54321',
      'service-key',
      spec,
    );

    expect(result).toEqual({ userId: 'new-user-id', created: true });
    expect(
      calls.some((call) => call.url.endsWith('/auth/v1/admin/users') && call.method === 'POST'),
    ).toBe(true);
  });

  it('resets the password of an already-existing local Auth user instead of silently reusing it', async () => {
    // Regression for the reproducibility bug: supabase/seed.sql inserts this
    // user with an unusable empty password hash. A version of this script
    // that only checks "does the user exist?" and stops there leaves that
    // unusable hash in place — the printed credentials look valid but the
    // user can never actually log in.
    const putCalls: Array<{ url: string; body: unknown }> = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/auth/v1/admin/users?')) {
        return jsonResponse({ users: [{ id: 'existing-user-id', email: spec.email }] });
      }
      if (url.endsWith('/auth/v1/admin/users/existing-user-id') && init?.method === 'PUT') {
        putCalls.push({ url, body: init.body ? JSON.parse(String(init.body)) : null });
        return jsonResponse({ id: 'existing-user-id' });
      }
      if (url.includes('/rest/v1/profiles')) return jsonResponse({});
      throw new Error(`Unexpected URL in test: ${url} (${init?.method})`);
    });

    const result = await seedLocalAuthUser(
      fetchImpl,
      'http://127.0.0.1:54321',
      'service-key',
      spec,
    );

    expect(result).toEqual({ userId: 'existing-user-id', created: false });
    expect(putCalls).toHaveLength(1);
    expect(putCalls[0].body).toMatchObject({ password: spec.password, email_confirm: true });
  });

  it('always upserts the profile row after create or password reset', async () => {
    const profileCalls: unknown[] = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/auth/v1/admin/users?')) {
        return jsonResponse({ users: [{ id: 'existing-user-id', email: spec.email }] });
      }
      if (url.endsWith('/auth/v1/admin/users/existing-user-id'))
        return jsonResponse({ id: 'existing-user-id' });
      if (url.includes('/rest/v1/profiles')) {
        profileCalls.push(init?.body ? JSON.parse(String(init.body)) : null);
        return jsonResponse({});
      }
      throw new Error(`Unexpected URL in test: ${url}`);
    });

    await seedLocalAuthUser(fetchImpl, 'http://127.0.0.1:54321', 'service-key', spec);

    expect(profileCalls).toEqual([
      {
        id: 'existing-user-id',
        display_name: spec.displayName,
        role: spec.role,
        is_active: true,
        email: spec.email,
      },
    ]);
  });
});
