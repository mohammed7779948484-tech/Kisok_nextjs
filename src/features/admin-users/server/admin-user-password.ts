import { getTrustedAdminSession } from '@/infrastructure/supabase/auth/server';
import { getServiceSupabaseClient } from '@/infrastructure/supabase/client/service-client';

type ServicePasswordClient = {
  auth: {
    admin: {
      updateUserById(
        id: string,
        attributes: { password: string },
      ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
    };
  };
};

type AdminUserPasswordDependencies = {
  getSession: typeof getTrustedAdminSession;
  getServiceClient: () => ServicePasswordClient;
};

/**
 * Mirrors `scripts/lib/local-auth-seed.ts`'s `resetPassword`: the reset is
 * unconditional. There is no reliable signal from the Auth Admin API that a
 * password "looks already set" — gating the call on such a check would
 * silently no-op a reset an Admin explicitly asked for.
 */
export async function executeAdminUserPasswordReset(
  input: { targetId: string; password: string },
  dependencies: AdminUserPasswordDependencies = {
    getSession: getTrustedAdminSession,
    getServiceClient: getServiceSupabaseClient,
  },
): Promise<{ id: string }> {
  const session = await dependencies.getSession();
  if (!session) {
    throw new Error('An active Admin session is required.');
  }

  const result = await dependencies
    .getServiceClient()
    .auth.admin.updateUserById(input.targetId, { password: input.password });
  if (result.error) throw new Error(result.error.message);

  return { id: input.targetId };
}
