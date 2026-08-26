import { getTrustedAdminSession } from '@/infrastructure/supabase/auth/server';
import { getServiceSupabaseClient } from '@/infrastructure/supabase/client/service-client';
import type { Database } from '@/infrastructure/supabase/database.types';

import type { AdminUserRecord } from '../types';

type ProfileRow = Database['public']['Functions']['search_admin_profiles']['Returns'][number];

type ServiceRpcClient = {
  rpc(
    name: string,
    args: unknown,
  ): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

type AdminUserSearchDependencies = {
  getSession: typeof getTrustedAdminSession;
  getServiceClient: () => ServiceRpcClient;
};

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

/**
 * `search_admin_profiles` is granted to `service_role` only (Lean V2 RLS
 * grants) — an authenticated browser client cannot call it. Search must go
 * through this trusted server boundary, mirroring `executeAdminUserUpdate`.
 */
export async function executeAdminUserSearch(
  input: { searchTerm: string; pageSize?: number; pageOffset?: number },
  dependencies: AdminUserSearchDependencies = {
    getSession: getTrustedAdminSession,
    getServiceClient: getServiceSupabaseClient,
  },
): Promise<AdminUserRecord[]> {
  const session = await dependencies.getSession();
  if (!session) {
    throw new Error('An active Admin session is required.');
  }

  const result = await dependencies.getServiceClient().rpc('search_admin_profiles', {
    search_term: input.searchTerm.trim(),
    page_size: input.pageSize ?? 50,
    page_offset: input.pageOffset ?? 0,
  });
  if (result.error) throw new Error(result.error.message);

  const rows = Array.isArray(result.data) ? (result.data as ProfileRow[]) : [];
  return rows.map(mapProfile);
}
