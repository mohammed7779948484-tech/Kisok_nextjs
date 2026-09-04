import { beforeEach, describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  notFound: vi.fn(),
  getTrustedAdminSession: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: testContext.redirect,
  notFound: testContext.notFound,
}));

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
}));

vi.mock('@/infrastructure/supabase/auth/server', () => ({
  getTrustedAdminSession: testContext.getTrustedAdminSession,
}));

vi.mock('@/features/auth-admin-access/components/AdminLoginForm', () => ({
  AdminLoginForm: () => null,
}));

import LoginPage from './page';

const activeAdminSession = {
  profile: { id: 'user-1', role: 'admin', is_active: true, display_name: 'Admin' },
  userId: 'user-1',
};

describe('LoginPage', () => {
  beforeEach(() => {
    testContext.redirect.mockClear();
    testContext.notFound.mockClear();
    testContext.getTrustedAdminSession.mockReset();
  });

  it('redirects an authenticated admin to the admin workspace instead of showing the form', async () => {
    testContext.getTrustedAdminSession.mockResolvedValue(activeAdminSession);

    await expect(
      LoginPage({
        params: Promise.resolve({ locale: 'en' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('REDIRECT:/en/admin');
  });

  it('redirects an authenticated admin to a validated admin-scoped next param when present', async () => {
    testContext.getTrustedAdminSession.mockResolvedValue(activeAdminSession);

    await expect(
      LoginPage({
        params: Promise.resolve({ locale: 'en' }),
        searchParams: Promise.resolve({ next: '/en/admin/orders' }),
      }),
    ).rejects.toThrow('REDIRECT:/en/admin/orders');
  });

  it('ignores an out-of-scope next param and redirects an authenticated admin to the admin root', async () => {
    testContext.getTrustedAdminSession.mockResolvedValue(activeAdminSession);

    await expect(
      LoginPage({
        params: Promise.resolve({ locale: 'en' }),
        searchParams: Promise.resolve({ next: '/en/somewhere-else' }),
      }),
    ).rejects.toThrow('REDIRECT:/en/admin');
  });

  it('renders the login form and does not redirect when there is no active admin session', async () => {
    testContext.getTrustedAdminSession.mockResolvedValue(null);

    const result = await LoginPage({
      params: Promise.resolve({ locale: 'en' }),
      searchParams: Promise.resolve({}),
    });

    expect(testContext.redirect).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
