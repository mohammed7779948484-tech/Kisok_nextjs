import { describe, expect, it } from 'vitest';

import { adminUserCreateFormSchema, adminUserEditFormSchema } from './admin-user.schema';

describe('adminUserCreateFormSchema', () => {
  const validInput = {
    displayName: 'New Person',
    email: 'new@example.test',
    password: 'CorrectHorseBattery1!',
    role: 'preparation' as const,
  };

  it('accepts a well-formed create payload', () => {
    expect(adminUserCreateFormSchema.safeParse(validInput).success).toBe(true);
  });

  it('rejects a blank display name', () => {
    const result = adminUserCreateFormSchema.safeParse({ ...validInput, displayName: '  ' });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed email', () => {
    const result = adminUserCreateFormSchema.safeParse({ ...validInput, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than 6 characters', () => {
    const result = adminUserCreateFormSchema.safeParse({ ...validInput, password: '12345' });
    expect(result.success).toBe(false);
  });

  it('rejects a role outside the allow-list', () => {
    const result = adminUserCreateFormSchema.safeParse({ ...validInput, role: 'superadmin' });
    expect(result.success).toBe(false);
  });

  it('accepts every role in the allow-list', () => {
    for (const role of ['admin', 'preparation', 'customer'] as const) {
      expect(adminUserCreateFormSchema.safeParse({ ...validInput, role }).success).toBe(true);
    }
  });
});

describe('adminUserEditFormSchema', () => {
  const validInput = { displayName: 'Renamed Person', role: 'admin' as const };

  it('accepts a well-formed edit payload', () => {
    expect(adminUserEditFormSchema.safeParse(validInput).success).toBe(true);
  });

  it('rejects a blank display name', () => {
    const result = adminUserEditFormSchema.safeParse({ ...validInput, displayName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a role outside the allow-list', () => {
    const result = adminUserEditFormSchema.safeParse({ ...validInput, role: 'owner' });
    expect(result.success).toBe(false);
  });
});
