import { NextRequest, NextResponse } from 'next/server';

import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  getClaims: vi.fn(),
  createServerClient: vi.fn(),
  intlMiddleware: vi.fn(),
}));

vi.mock('next-intl/middleware', () => ({
  default: () => testContext.intlMiddleware,
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: testContext.createServerClient,
}));

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.test',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
  },
}));

import { proxy } from './proxy';

type SetAll = (
  cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>,
  headers: Record<string, string>,
) => void;

describe('proxy', () => {
  it('refreshes the Supabase session, propagates the refreshed cookies, and returns the next-intl response untouched otherwise', async () => {
    const intlResponse = NextResponse.next();
    intlResponse.headers.set('x-next-intl-locale', 'en');
    testContext.intlMiddleware.mockReturnValue(intlResponse);

    let capturedSetAll: SetAll | undefined;
    testContext.createServerClient.mockImplementation(
      (
        _url: string,
        _key: string,
        options: { cookies: { getAll: () => unknown; setAll: SetAll } },
      ) => {
        capturedSetAll = options.cookies.setAll;
        return {
          auth: {
            getClaims: testContext.getClaims.mockImplementation(async () => {
              capturedSetAll?.(
                [{ name: 'sb-access-token', value: 'refreshed-token', options: { path: '/' } }],
                {},
              );
              return { data: { claims: { sub: 'user-1' } }, error: null };
            }),
          },
        };
      },
    );

    const request = new NextRequest('https://kiosk.test/en/admin');
    const response = await proxy(request);

    expect(testContext.intlMiddleware).toHaveBeenCalledWith(request);
    expect(testContext.getClaims).toHaveBeenCalledTimes(1);

    expect(response.cookies.get('sb-access-token')?.value).toBe('refreshed-token');

    expect(response).toBe(intlResponse);
    expect(response.headers.get('x-next-intl-locale')).toBe('en');
  });

  it('skips the Supabase session refresh when Supabase is not configured, while still returning the next-intl response', async () => {
    vi.resetModules();
    vi.doMock('@/lib/env', () => ({
      env: {
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
      },
    }));
    testContext.getClaims.mockClear();
    testContext.createServerClient.mockClear();

    const intlResponse = NextResponse.next();
    intlResponse.headers.set('x-next-intl-locale', 'en');
    testContext.intlMiddleware.mockReturnValue(intlResponse);

    const { proxy: proxyWithoutConfig } = await import('./proxy');
    const request = new NextRequest('https://kiosk.test/en/admin');
    const response = await proxyWithoutConfig(request);

    expect(testContext.createServerClient).not.toHaveBeenCalled();
    expect(response).toBe(intlResponse);
    expect(response.headers.get('x-next-intl-locale')).toBe('en');
  });
});
