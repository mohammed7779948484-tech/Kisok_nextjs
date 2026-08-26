import { createClient } from '@supabase/supabase-js';

import { getTrustedAdminSession } from '@/infrastructure/supabase/auth/server';
import type { Database } from '@/infrastructure/supabase/database.types';
import { env } from '@/lib/env';

export type AdminUserProfileChanges = {
  display_name?: string;
  role?: Database['public']['Enums']['app_role'];
  is_active?: boolean;
};

type ServiceRpcClient = {
  rpc(
    name: string,
    args: unknown,
  ): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

type AdminUserOperationDependencies = {
  getSession: typeof getTrustedAdminSession;
  getServiceClient: () => ServiceRpcClient;
};

function createServiceClient(): ServiceRpcClient {
  if (!(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error('Server Supabase service configuration is unavailable.');
  }
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function executeAdminUserUpdate(
  input: { targetId: string; changes: AdminUserProfileChanges },
  dependencies: AdminUserOperationDependencies = {
    getSession: getTrustedAdminSession,
    getServiceClient: createServiceClient,
  },
) {
  const session = await dependencies.getSession();
  if (!session) {
    throw new Error('An active Admin session is required.');
  }

  const result = await dependencies.getServiceClient().rpc('admin_update_profile', {
    actor_id: session.userId,
    target_id: input.targetId,
    changes: input.changes,
  });
  if (result.error) throw new Error(result.error.message);

  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row || typeof row !== 'object') {
    throw new Error('Admin User update returned no profile.');
  }
  return row as {
    id: string;
    display_name: string;
    role: Database['public']['Enums']['app_role'];
    is_active: boolean;
    updated_at: string;
  };
}
