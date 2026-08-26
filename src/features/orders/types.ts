import type { Database } from '@/infrastructure/supabase/database.types';

export type OrderStatus = Database['public']['Enums']['order_status'];

export interface OrderItemRecord {
  id: string;
  productName: string;
  variantName: string | null;
  variantSku: string;
  variantOptions: string;
  brandName: string | null;
  imageSecureUrl: string | null;
  quantity: number;
}

export interface OrderRecord {
  id: string;
  displayNumber: string;
  status: OrderStatus;
  itemCount: number;
  items: OrderItemRecord[];
  createdAt: string;
}

export interface OrdersDataContract {
  listOrders(): Promise<OrderRecord[]>;
  updateStatus(orderId: string, targetStatus: OrderStatus, reason?: string): Promise<unknown>;
}
