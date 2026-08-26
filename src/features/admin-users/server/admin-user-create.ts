import { getTrustedAdminSession } from '@/infrastructure/supabase/auth/server';
import { getServiceSupabaseClient } from '@/infrastructure/supabase/client/service-client';
import type { Database } from '@/infrastructure/supabase/database.types';

import type { AdminUserRecord } from '../types';

export type AdminUserCreateInput = {
  email: string;
  password: string;
  displayName: string;
  role: Database['public']['Enums']['app_role'];
};

type ServiceUserCreateClient = {
  auth: {
    admin: {
      createUser(attributes: unknown): PromiseLike<{
        data: { user: { id: string } | null };
        error: { message: string } | null;
      }>;
      deleteUser(id: string): PromiseLike<{ error: { message: string } | null }>;
    };
  };
  from(table: string): {
    insert(row: unknown): {
      select(): {
        single(): PromiseLike<{ data: unknown; error: { message: string } | null }>;
      };
    };
  };
};

type AdminUserCreateDependencies = {
  getSession: typeof getTrustedAdminSession;
  getServiceClient: () => ServiceUserCreateClient;
};

type ProfileInsertRow = {
  id: string;
  display_name: string;
  email: string;
  role: Database['public']['Enums']['app_role'];
  is_active: boolean;
  created_at: string;
};

function mapProfile(row: ProfileInsertRow): AdminUserRecord {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    totalCount: 1,
  };
}

/**
 * `profiles` has no `on_auth_user_created` trigger (confirmed against the
 * Lean V2 migrations — only `sync_profile_email_from_auth` reacts to
 * `auth.users` changes, and it only keeps `email` in sync on an existing
 * row). Creating an Admin/Preparation user therefore requires inserting the
 * `profiles` row ourselves, mirroring `scripts/lib/local-auth-seed.ts`'s
 * `upsertProfile` step — never `admin_update_profile`, which requires the
 * target profile to already exist.
 */
export async function executeAdminUserCreate(
  input: AdminUserCreateInput,
  dependencies: AdminUserCreateDependencies = {
    getSession: getTrustedAdminSession,
    getServiceClient: getServiceSupabaseClient,
  },
): Promise<AdminUserRecord> {
  const session = await dependencies.getSession();
  if (!session) {
    throw new Error('An active Admin session is required.');
  }

  const client = dependencies.getServiceClient();

  const created = await client.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    throw new Error(created.error?.message ?? 'Auth user creation returned no user.');
  }

  const userId = created.data.user.id;

  const inserted = await client
    .from('profiles')
    .insert({
      id: userId,
      display_name: input.displayName,
      email: input.email,
      role: input.role,
      is_active: true,
    })
    .select()
    .single();

  if (inserted.error || !inserted.data) {
    try {
      await client.auth.admin.deleteUser(userId);
    } catch {
      // Best-effort rollback only — the primary error below is what surfaces.
    }
    throw new Error(inserted.error?.message ?? 'Admin User profile creation returned no profile.');
  }

  return mapProfile(inserted.data as ProfileInsertRow);
}
