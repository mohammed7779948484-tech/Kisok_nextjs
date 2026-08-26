export type TrustedProfile = {
  id: string;
  display_name: string;
  role: 'admin' | 'preparation' | 'customer';
  is_active: boolean;
};

export function isTrustedAdminProfile(
  profile: TrustedProfile | null | undefined,
): profile is TrustedProfile & { role: 'admin'; is_active: true } {
  return profile?.role === 'admin' && profile.is_active;
}
