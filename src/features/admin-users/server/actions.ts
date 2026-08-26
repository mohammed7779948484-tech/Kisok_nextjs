'use server';

import { type AdminUserProfileChanges, executeAdminUserUpdate } from './admin-user-operation';

export async function updateAdminUser(input: {
  targetId: string;
  changes: AdminUserProfileChanges;
}) {
  return executeAdminUserUpdate(input);
}
