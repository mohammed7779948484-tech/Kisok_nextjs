'use server';

import { type AdminUserProfileChanges, executeAdminUserUpdate } from './admin-user-operation';
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
