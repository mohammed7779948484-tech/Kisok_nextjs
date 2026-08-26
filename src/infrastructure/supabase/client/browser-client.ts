'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';

import { getSupabaseConfig } from './supabase-config';

let browserClient: SupabaseClient | null = null;

export function getBrowserSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  if (!config) {
    return null;
  }

  browserClient ??= createBrowserClient(config.url, config.key);
  return browserClient;
}
