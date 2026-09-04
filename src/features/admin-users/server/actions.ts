'use server';

import { type AdminUserCreateInput, executeAdminUserCreate } from './admin-user-create';
import { type AdminUserProfileChanges, executeAdminUserUpdate } from './admin-user-operation';
import { executeAdminUserPasswordReset } from './admin-user-password';
import { executeAdminUserSearch } from './admin-user-search';

export async function updateAdminUser(input: {
  targetId: string;
  changes: AdminUserProfileChanges;
}) {
  return executeAdminUserUpdate(input);
}

export async function searchAdminUsers(input: {
  searchTerm: string;
  pageSize?: number;
  pageOffset?: number;
}) {
  return executeAdminUserSearch(input);
}

export async function createAdminUser(input: AdminUserCreateInput) {
  return executeAdminUserCreate(input);
}

export async function resetAdminUserPassword(input: { targetId: string; password: string }) {
  return executeAdminUserPasswordReset(input);
}
