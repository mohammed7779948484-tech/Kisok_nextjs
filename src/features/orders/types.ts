import type { ListDataContract } from '@/shared/contracts';

export type OrderStatus = 'Cancelled' | 'Completed' | 'New' | 'Preparing' | 'Ready';

export interface LocalOrder {
  id: string;
  status: OrderStatus;
  itemCount: number;
  createdAt: string;
  customerLabel: string;
}

export interface OrdersDataContract extends ListDataContract<LocalOrder> {}
