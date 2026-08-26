import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  searchAdminUsers: vi.fn(),
}));

vi.mock('../server/actions', () => ({
  searchAdminUsers: testContext.searchAdminUsers,
}));

vi.mock('@/infrastructure/supabase/client/browser-client', () => ({
  getBrowserSupabaseClient: () => {
    throw new Error(
      'Admin Users search must never use the browser Supabase client: search_admin_profiles is service_role-only.',
    );
  },
}));

import { adminUsersRepository } from './index';

describe('Admin Users repository', () => {
  it('delegates search to the trusted server action instead of a browser Supabase client', async () => {
    testContext.searchAdminUsers.mockResolvedValue([
      {
        id: 'profile-1',
        displayName: 'Amina Admin',
        email: 'amina@example.test',
        role: 'admin',
        isActive: true,
        createdAt: '2026-08-26T00:00:00Z',
        totalCount: 1,
      },
    ]);

    await expect(adminUsersRepository.search('amina', 25, 0)).resolves.toEqual([
      {
        id: 'profile-1',
        displayName: 'Amina Admin',
        email: 'amina@example.test',
        role: 'admin',
        isActive: true,
        createdAt: '2026-08-26T00:00:00Z',
        totalCount: 1,
      },
    ]);
    expect(testContext.searchAdminUsers).toHaveBeenCalledWith({
      searchTerm: 'amina',
      pageSize: 25,
      pageOffset: 0,
    });
  });
});
