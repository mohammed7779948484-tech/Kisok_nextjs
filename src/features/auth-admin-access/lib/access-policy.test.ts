import { describe, expect, it } from 'vitest';

import { isTrustedAdminProfile } from './access-policy';

describe('isTrustedAdminProfile', () => {
  it('accepts only an active profile with the admin role', () => {
    expect(
      isTrustedAdminProfile({
        id: 'admin-1',
        display_name: 'Admin',
        role: 'admin',
        is_active: true,
      }),
    ).toBe(true);
    expect(
      isTrustedAdminProfile({
        id: 'admin-2',
        display_name: 'Inactive Admin',
        role: 'admin',
        is_active: false,
      }),
    ).toBe(false);
    expect(
      isTrustedAdminProfile({
        id: 'prep-1',
        display_name: 'Preparation',
        role: 'preparation',
        is_active: true,
      }),
    ).toBe(false);
    expect(isTrustedAdminProfile(null)).toBe(false);
  });
});
