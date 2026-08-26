import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  executeAdminUserUpdate: vi.fn(),
}));

vi.mock('./admin-user-operation', () => ({
  executeAdminUserUpdate: testContext.executeAdminUserUpdate,
}));

import { updateAdminUser } from './actions';

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
});
