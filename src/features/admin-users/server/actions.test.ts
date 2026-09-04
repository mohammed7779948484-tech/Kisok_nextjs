import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  executeAdminUserUpdate: vi.fn(),
  executeAdminUserCreate: vi.fn(),
  executeAdminUserPasswordReset: vi.fn(),
}));

vi.mock('./admin-user-operation', () => ({
  executeAdminUserUpdate: testContext.executeAdminUserUpdate,
}));

vi.mock('./admin-user-create', () => ({
  executeAdminUserCreate: testContext.executeAdminUserCreate,
}));

vi.mock('./admin-user-password', () => ({
  executeAdminUserPasswordReset: testContext.executeAdminUserPasswordReset,
}));

import { createAdminUser, resetAdminUserPassword, updateAdminUser } from './actions';

describe('Admin User server action', () => {
  it('delegates profile changes to the server-only operation', async () => {
    testContext.executeAdminUserUpdate.mockResolvedValue({
      id: 'profile-2',
      display_name: 'Renamed',
      role: 'preparation',
      is_active: true,
      updated_at: '2026-08-26T00:00:00Z',
    });

    await expect(
      updateAdminUser({
        targetId: 'profile-2',
        changes: { display_name: 'Renamed', role: 'preparation' },
      }),
    ).resolves.toMatchObject({ id: 'profile-2' });
    expect(testContext.executeAdminUserUpdate).toHaveBeenCalledWith({
      targetId: 'profile-2',
      changes: { display_name: 'Renamed', role: 'preparation' },
    });
  });

  it('delegates Admin User creation to the server-only operation', async () => {
    testContext.executeAdminUserCreate.mockResolvedValue({
      id: 'profile-3',
      displayName: 'New Person',
      email: 'new@example.test',
      role: 'preparation',
      isActive: true,
      createdAt: '2026-08-26T00:00:00Z',
      totalCount: 1,
    });

    await expect(
      createAdminUser({
        email: 'new@example.test',
        password: 'CorrectHorseBattery1!',
        displayName: 'New Person',
        role: 'preparation',
      }),
    ).resolves.toMatchObject({ id: 'profile-3' });
    expect(testContext.executeAdminUserCreate).toHaveBeenCalledWith({
      email: 'new@example.test',
      password: 'CorrectHorseBattery1!',
      displayName: 'New Person',
      role: 'preparation',
    });
  });

  it('delegates a password reset to the server-only operation', async () => {
    testContext.executeAdminUserPasswordReset.mockResolvedValue({ id: 'profile-2' });

    await expect(
      resetAdminUserPassword({ targetId: 'profile-2', password: 'NewPassword123!' }),
    ).resolves.toEqual({ id: 'profile-2' });
    expect(testContext.executeAdminUserPasswordReset).toHaveBeenCalledWith({
      targetId: 'profile-2',
      password: 'NewPassword123!',
    });
  });
});
