import { getBrowserSupabaseClient } from '../client/browser-client';

export type AdminSignInResult =
  | { ok: true }
  | { ok: false; reason: 'configuration' | 'credentials' | 'network' | 'not-admin' };

function isServiceConnectivityError(error: { message?: string; status?: number | null }): boolean {
  return (
    error.status === 0 ||
    (typeof error.status === 'number' && error.status >= 500) ||
    /network|fetch|connection|timeout|offline|unavailable/i.test(error.message ?? '')
  );
}

export async function signInAdmin(email: string, password: string): Promise<AdminSignInResult> {
  const supabase = getBrowserSupabaseClient();

  if (!supabase) {
    return { ok: false, reason: 'configuration' };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    return {
      ok: false,
      reason: isServiceConnectivityError(signInError) ? 'network' : 'credentials',
    };
  }

  const { data: profileData, error: profileError } = await supabase.rpc('current_active_profile');
  if (profileError) {
    await supabase.auth.signOut();
    return { ok: false, reason: 'network' };
  }
  const profile = Array.isArray(profileData) ? profileData[0] : profileData;

  if (profile?.role !== 'admin' || profile.is_active !== true) {
    await supabase.auth.signOut();
    return { ok: false, reason: 'not-admin' };
  }

  return { ok: true };
}

export async function signOutCurrentUser() {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}
