import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { createServerClient } from '@supabase/ssr';

import { env } from '@/lib/env';

import { routing } from './i18n/routing';
import { getSupabaseConfig } from './infrastructure/supabase/client/supabase-config';

const handleI18nRouting = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const response = handleI18nRouting(request) ?? NextResponse.next({ request });
  const config = getSupabaseConfig(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  if (!config) {
    return response;
  }

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: [
    '/((?!api|trpc|_next/static|_next/image|_vercel|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|sw.js|opengraph-image\\.[^/]+|twitter-image\\.[^/]+|apple-icon\\.[^/]+|icon\\.[^/]+|.*\\.(?:js|css|map|json|svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|eot|mp4|webm)).*)',
  ],
};
