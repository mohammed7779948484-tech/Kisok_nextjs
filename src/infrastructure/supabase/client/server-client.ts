import { cookies } from 'next/headers';

import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';

import { getSupabaseConfig } from './supabase-config';

export async function getServerSupabaseClient(): Promise<SupabaseClient | null> {
  const config = getSupabaseConfig(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  if (!config) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write response cookies. Proxy refreshes them.
        }
      },
    },
  });
}
