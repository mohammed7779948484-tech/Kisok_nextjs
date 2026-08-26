import { getBrowserSupabaseClient } from '../client/browser-client';

export type AdminSignInResult =
  | { ok: true }
  | { ok: false; reason: 'configuration' | 'credentials' | 'not-admin' };

export async function signInAdmin(email: string, password: string): Promise<AdminSignInResult> {
  const supabase = getBrowserSupabaseClient();

  if (!supabase) {
    return { ok: false, reason: 'configuration' };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    return { ok: false, reason: 'credentials' };
  }

  const { data: profileData, error: profileError } = await supabase.rpc('current_active_profile');
  const profile = Array.isArray(profileData) ? profileData[0] : profileData;

  if (profileError || profile?.role !== 'admin' || profile.is_active !== true) {
    await supabase.auth.signOut();
    return { ok: false, reason: 'not-admin' };
  }

  return { ok: true };
}

export async function signOutCurrentUser() {
  await getBrowserSupabaseClient()?.auth.signOut();
}
