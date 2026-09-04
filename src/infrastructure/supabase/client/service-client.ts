import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';

import type { Database } from '../database.types';

/**
 * Trusted-server-only client. Bypasses RLS with the service-role key —
 * never import this from a browser-executable module. Callers must gate
 * every use behind `getTrustedAdminSession()` first.
 */
export function getServiceSupabaseClient(): SupabaseClient<Database> {
  if (!(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error('Server Supabase service configuration is unavailable.');
  }
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
