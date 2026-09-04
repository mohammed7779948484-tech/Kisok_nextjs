import type { Database } from '@/infrastructure/supabase/database.types';

export interface AdminUserRecord {
  id: string;
  displayName: string;
  email: string;
  role: Database['public']['Enums']['app_role'];
  isActive: boolean;
  createdAt: string;
  totalCount: number;
}

export interface AdminUsersDataContract {
  search(searchTerm: string, pageSize?: number, pageOffset?: number): Promise<AdminUserRecord[]>;
}
