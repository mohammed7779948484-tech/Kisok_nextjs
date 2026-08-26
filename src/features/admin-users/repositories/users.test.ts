import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => ({
  client: {
    rpc: async (name: string, args: unknown) => ({
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
      name,
      args,
    }),
  } as unknown as SupabaseClient<Database>,
}));

vi.mock('@/infrastructure/supabase/client/browser-client', () => ({
  getBrowserSupabaseClient: () => testContext.client,
}));

import { adminUsersRepository } from './index';

describe('Admin Users Supabase repository', () => {
  it('searches hosted profiles through the Lean V2 RPC', async () => {
    await expect(adminUsersRepository.search('amina')).resolves.toEqual([
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
  });
});
