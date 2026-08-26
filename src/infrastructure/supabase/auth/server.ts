import type { SupabaseClient } from '@supabase/supabase-js';

import {
  isTrustedAdminProfile,
  type TrustedProfile,
} from '@/features/auth-admin-access/lib/access-policy';

import { getServerSupabaseClient } from '../client/server-client';

export type AdminSession = {
  profile: TrustedProfile & { role: 'admin'; is_active: true };
  userId: string;
};

export async function getTrustedAdminSession(
  client?: SupabaseClient | null,
): Promise<AdminSession | null> {
  const supabase = client ?? (await getServerSupabaseClient());

  if (!supabase) {
    return null;
  }

  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (claimsError || typeof userId !== 'string') {
    return null;
  }

  const { data, error } = await supabase.rpc('current_active_profile');
  const profile = Array.isArray(data) ? data[0] : data;

  if (error || !isTrustedAdminProfile(profile) || profile.id !== userId) {
    return null;
  }

  return { profile, userId };
}
