export interface LocalAdminUser {
  access: 'Administrator' | 'Preparation';
  name: string;
  state: 'Active' | 'Paused';
}

export interface AdminUsersDataContract {
  list(): readonly LocalAdminUser[];
}
