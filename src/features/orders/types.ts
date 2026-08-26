import type { Database } from '@/infrastructure/supabase/database.types';

export type OrderStatus = Database['public']['Enums']['order_status'];

export interface OrderRecord {
  id: string;
  displayNumber: string;
  status: OrderStatus;
  itemCount: number;
  createdAt: string;
}

export interface OrdersDataContract {
  listOrders(): Promise<OrderRecord[]>;
  updateStatus(orderId: string, targetStatus: OrderStatus, reason?: string): Promise<unknown>;
}
