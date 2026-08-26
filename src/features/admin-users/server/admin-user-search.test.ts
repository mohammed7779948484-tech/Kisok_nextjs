import { describe, expect, it, vi } from 'vitest';

import { executeAdminUserSearch } from './admin-user-search';

const activeAdmin = {
  userId: 'admin-1',
  profile: {
    id: 'admin-1',
    display_name: 'Amina Admin',
    role: 'admin' as const,
    is_active: true as const,
  },
};

describe('server-only Admin User search boundary', () => {
  it('denies search when the request has no trusted active Admin session', async () => {
    const rpc = vi.fn();

    await expect(
      executeAdminUserSearch(
        { searchTerm: 'amina' },
        { getSession: async () => null, getServiceClient: () => ({ rpc }) },
      ),
    ).rejects.toThrow('An active Admin session is required.');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('uses the service-only Lean search RPC after verifying the active Admin session', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'profile-1',
          display_name: 'Amina Admin',
          email: 'amina@example.test',
          role: 'admin',
          is_active: true,
          created_at: '2026-08-26T00:00:00Z',
          total_count: 1,
        },
      ],
      error: null,
    });

    await expect(
      executeAdminUserSearch(
        { searchTerm: ' amina ', pageOffset: 0, pageSize: 25 },
        { getSession: async () => activeAdmin, getServiceClient: () => ({ rpc }) },
      ),
    ).resolves.toEqual([
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

    expect(rpc).toHaveBeenCalledWith('search_admin_profiles', {
      search_term: 'amina',
      page_size: 25,
      page_offset: 0,
    });
  });
});
