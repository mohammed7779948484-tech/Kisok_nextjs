import type { AdminUsersDataContract, LocalAdminUser } from '../types';

export const localAdminUsers: readonly LocalAdminUser[] = [
  { access: 'Administrator', name: 'Mariam Al-Harbi', state: 'Active' },
  { access: 'Preparation', name: 'Hassan Saleh', state: 'Active' },
  { access: 'Preparation', name: 'Salem Noor', state: 'Paused' },
];

export const localAdminUsersContract: AdminUsersDataContract = {
  list: () => localAdminUsers,
};
