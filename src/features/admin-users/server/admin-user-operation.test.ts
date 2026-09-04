import { describe, expect, it, vi } from 'vitest';

import { executeAdminUserUpdate } from './admin-user-operation';

const activeAdmin = {
  userId: 'admin-1',
  profile: {
    id: 'admin-1',
    display_name: 'Amina Admin',
    role: 'admin' as const,
    is_active: true as const,
  },
};

describe('server-only Admin User mutation boundary', () => {
  it('denies mutation when the request has no trusted active Admin session', async () => {
    const rpc = vi.fn();

    await expect(
      executeAdminUserUpdate(
        { targetId: 'profile-2', changes: { display_name: 'Renamed' } },
        { getSession: async () => null, getServiceClient: () => ({ rpc }) },
      ),
    ).rejects.toThrow('An active Admin session is required.');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('uses the service-only Lean profile RPC after verifying the active Admin session', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'profile-2',
          display_name: 'Renamed',
          role: 'preparation',
          is_active: true,
          updated_at: '2026-08-26T00:00:00Z',
        },
      ],
      error: null,
    });

    await expect(
      executeAdminUserUpdate(
        { targetId: 'profile-2', changes: { display_name: 'Renamed', role: 'preparation' } },
        { getSession: async () => activeAdmin, getServiceClient: () => ({ rpc }) },
      ),
    ).resolves.toMatchObject({ id: 'profile-2', display_name: 'Renamed' });

    expect(rpc).toHaveBeenCalledWith('admin_update_profile', {
      actor_id: 'admin-1',
      target_id: 'profile-2',
      changes: { display_name: 'Renamed', role: 'preparation' },
    });
  });

  it('surfaces the DB last-active-administrator invariant cleanly instead of crashing', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'the last active administrator cannot be changed' },
    });

    await expect(
      executeAdminUserUpdate(
        { targetId: 'admin-2', changes: { is_active: false } },
        { getSession: async () => activeAdmin, getServiceClient: () => ({ rpc }) },
      ),
    ).rejects.toThrow('the last active administrator cannot be changed');
  });

  it('surfaces the DB self-demotion invariant cleanly instead of crashing', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'you cannot remove your own administrator access' },
    });

    await expect(
      executeAdminUserUpdate(
        { targetId: 'admin-1', changes: { role: 'preparation' } },
        { getSession: async () => activeAdmin, getServiceClient: () => ({ rpc }) },
      ),
    ).rejects.toThrow('you cannot remove your own administrator access');
  });
});
