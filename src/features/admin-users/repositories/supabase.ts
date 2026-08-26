import type { SupabaseClient } from '@supabase/supabase-js';

import { getBrowserSupabaseClient } from '@/infrastructure/supabase/client/browser-client';
import type { Database } from '@/infrastructure/supabase/database.types';

import type { AdminUserRecord, AdminUsersDataContract } from '../types';

type ProfileRow = Database['public']['Functions']['search_admin_profiles']['Returns'][number];

function getClientOrThrow(): SupabaseClient<Database> {
  const client = getBrowserSupabaseClient();
  if (!client) throw new Error('Supabase is not configured for Admin Users.');
  return client;
}

function mapProfile(row: ProfileRow): AdminUserRecord {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    totalCount: row.total_count,
  };
}

export function createAdminUsersRepository(
  client: SupabaseClient<Database>,
): AdminUsersDataContract {
  return {
    async search(searchTerm, pageSize = 50, pageOffset = 0) {
      const result = await client.rpc('search_admin_profiles', {
        search_term: searchTerm.trim(),
        page_size: pageSize,
        page_offset: pageOffset,
      });
      if (result.error) throw result.error;
      return (result.data ?? []).map(mapProfile);
    },
  };
}

export const adminUsersRepository: AdminUsersDataContract = {
  search(searchTerm, pageSize, pageOffset) {
    return createAdminUsersRepository(getClientOrThrow()).search(searchTerm, pageSize, pageOffset);
  },
};
