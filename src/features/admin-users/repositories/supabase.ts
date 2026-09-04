import { searchAdminUsers } from '../server/actions';
import type { AdminUsersDataContract } from '../types';

/**
 * `search_admin_profiles` is granted to `service_role` only (Lean V2 RLS
 * grants) — this repository never talks to Supabase directly. It delegates
 * to the trusted server action, which enforces `getTrustedAdminSession()`
 * before using the service-role client.
 */
export const adminUsersRepository: AdminUsersDataContract = {
  search(searchTerm, pageSize, pageOffset) {
    return searchAdminUsers({ searchTerm, pageSize, pageOffset });
  },
};
