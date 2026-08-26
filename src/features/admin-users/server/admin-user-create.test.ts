import { describe, expect, it, vi } from 'vitest';

import { executeAdminUserCreate } from './admin-user-create';

const activeAdmin = {
  userId: 'admin-1',
  profile: {
    id: 'admin-1',
    display_name: 'Amina Admin',
    role: 'admin' as const,
    is_active: true as const,
  },
};

describe('server-only Admin User creation boundary', () => {
  it('denies creation when the request has no trusted active Admin session', async () => {
    const createUser = vi.fn();
    const from = vi.fn();

    await expect(
      executeAdminUserCreate(
        {
          email: 'new@example.test',
          password: 'CorrectHorseBattery1!',
          displayName: 'New Person',
          role: 'preparation',
        },
        {
          getSession: async () => null,
          getServiceClient: () => ({ auth: { admin: { createUser, deleteUser: vi.fn() } }, from }),
        },
      ),
    ).rejects.toThrow('An active Admin session is required.');
    expect(createUser).not.toHaveBeenCalled();
  });

  it('creates the Auth user then the Lean profile row after verifying the active Admin session', async () => {
    const createUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user-1' } },
      error: null,
    });
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'new-user-1',
        display_name: 'New Person',
        email: 'new@example.test',
        role: 'preparation',
        is_active: true,
        created_at: '2026-08-26T00:00:00Z',
      },
      error: null,
    });
    const insert = vi.fn(() => ({ select: () => ({ single }) }));
    const from = vi.fn(() => ({ insert }));

    await expect(
      executeAdminUserCreate(
        {
          email: 'new@example.test',
          password: 'CorrectHorseBattery1!',
          displayName: 'New Person',
          role: 'preparation',
        },
        {
          getSession: async () => activeAdmin,
          getServiceClient: () => ({ auth: { admin: { createUser, deleteUser: vi.fn() } }, from }),
        },
      ),
    ).resolves.toMatchObject({ id: 'new-user-1', displayName: 'New Person', role: 'preparation' });

    expect(createUser).toHaveBeenCalledWith({
      email: 'new@example.test',
      password: 'CorrectHorseBattery1!',
      email_confirm: true,
    });
    expect(from).toHaveBeenCalledWith('profiles');
    expect(single).toHaveBeenCalled();
  });

  it('surfaces the Auth Admin API error without inserting a profile row', async () => {
    const createUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'A user with this email address has already been registered' },
    });
    const insert = vi.fn();
    const from = vi.fn(() => ({ insert }));

    await expect(
      executeAdminUserCreate(
        {
          email: 'dup@example.test',
          password: 'CorrectHorseBattery1!',
          displayName: 'Dup Person',
          role: 'preparation',
        },
        {
          getSession: async () => activeAdmin,
          getServiceClient: () => ({ auth: { admin: { createUser, deleteUser: vi.fn() } }, from }),
        },
      ),
    ).rejects.toThrow('A user with this email address has already been registered');
    expect(insert).not.toHaveBeenCalled();
  });

  it('rolls back the Auth user when the profile insert fails', async () => {
    const createUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'orphan-1' } },
      error: null,
    });
    const deleteUser = vi.fn().mockResolvedValue({ error: null });
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'duplicate key value violates unique constraint' },
    });
    const insert = vi.fn(() => ({ select: () => ({ single }) }));
    const from = vi.fn(() => ({ insert }));

    await expect(
      executeAdminUserCreate(
        {
          email: 'new@example.test',
          password: 'CorrectHorseBattery1!',
          displayName: 'New Person',
          role: 'preparation',
        },
        {
          getSession: async () => activeAdmin,
          getServiceClient: () => ({ auth: { admin: { createUser, deleteUser } }, from }),
        },
      ),
    ).rejects.toThrow('duplicate key value violates unique constraint');

    expect(deleteUser).toHaveBeenCalledWith('orphan-1');
  });
});
