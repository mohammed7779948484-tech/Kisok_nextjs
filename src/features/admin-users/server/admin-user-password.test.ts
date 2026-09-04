import { describe, expect, it, vi } from 'vitest';

import { executeAdminUserPasswordReset } from './admin-user-password';

const activeAdmin = {
  userId: 'admin-1',
  profile: {
    id: 'admin-1',
    display_name: 'Amina Admin',
    role: 'admin' as const,
    is_active: true as const,
  },
};

describe('server-only Admin User password reset boundary', () => {
  it('denies a reset when the request has no trusted active Admin session', async () => {
    const updateUserById = vi.fn();

    await expect(
      executeAdminUserPasswordReset(
        { targetId: 'profile-2', password: 'NewPassword123!' },
        {
          getSession: async () => null,
          getServiceClient: () => ({ auth: { admin: { updateUserById } } }),
        },
      ),
    ).rejects.toThrow('An active Admin session is required.');
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('unconditionally sets the new password through the Auth Admin API', async () => {
    const updateUserById = vi.fn().mockResolvedValue({ data: { user: {} }, error: null });

    await expect(
      executeAdminUserPasswordReset(
        { targetId: 'profile-2', password: 'NewPassword123!' },
        {
          getSession: async () => activeAdmin,
          getServiceClient: () => ({ auth: { admin: { updateUserById } } }),
        },
      ),
    ).resolves.toEqual({ id: 'profile-2' });

    expect(updateUserById).toHaveBeenCalledWith('profile-2', { password: 'NewPassword123!' });
  });

  it('surfaces the Auth Admin API error', async () => {
    const updateUserById = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Password should be at least 6 characters' },
    });

    await expect(
      executeAdminUserPasswordReset(
        { targetId: 'profile-2', password: '123' },
        {
          getSession: async () => activeAdmin,
          getServiceClient: () => ({ auth: { admin: { updateUserById } } }),
        },
      ),
    ).rejects.toThrow('Password should be at least 6 characters');
  });
});
