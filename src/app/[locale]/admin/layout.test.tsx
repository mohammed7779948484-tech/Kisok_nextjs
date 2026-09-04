import type { ReactNode } from 'react';

import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  getTrustedAdminSession: vi.fn(),
  headersGet: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: testContext.redirect,
}));

vi.mock('next/headers', () => ({
  headers: async () => ({ get: testContext.headersGet }),
}));

vi.mock('@/infrastructure/supabase/auth/server', () => ({
  getTrustedAdminSession: testContext.getTrustedAdminSession,
}));

vi.mock('@/features/dashboard-operations/components/AdminShell', () => ({
  AdminShell: ({ children }: { children: ReactNode }) => children,
}));

import AdminLayout from './layout';

describe('AdminLayout', () => {
  it('redirects unauthenticated visitors to login with the actually requested admin path', async () => {
    testContext.getTrustedAdminSession.mockResolvedValue(null);
    testContext.headersGet.mockImplementation((key: string) =>
      key === 'x-pathname' ? '/en/admin/orders' : null,
    );

    await expect(
      AdminLayout({
        children: null,
        params: Promise.resolve({ locale: 'en' }),
      }),
    ).rejects.toThrow('REDIRECT:/en/login?next=/en/admin/orders');
  });

  it('falls back to the admin root when no forwarded pathname header is present', async () => {
    testContext.getTrustedAdminSession.mockResolvedValue(null);
    testContext.headersGet.mockReturnValue(null);

    await expect(
      AdminLayout({
        children: null,
        params: Promise.resolve({ locale: 'en' }),
      }),
    ).rejects.toThrow('REDIRECT:/en/login?next=/en/admin');
  });
});
