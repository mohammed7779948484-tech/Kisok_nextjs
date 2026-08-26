import type { ListDataContract } from '@/shared/contracts';

export interface LocalAdminUser {
  access: 'Administrator' | 'Preparation';
  name: string;
  state: 'Active' | 'Paused';
}

export interface AdminUsersDataContract extends ListDataContract<LocalAdminUser> {}
