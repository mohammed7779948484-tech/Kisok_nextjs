import type { ListDataContract } from '@/shared/contracts';

export type OrderStatus = 'Completed' | 'New' | 'Preparing';

export interface LocalOrder {
  id: string;
  status: OrderStatus;
  total: string;
  type: string;
}

export interface OrdersDataContract extends ListDataContract<LocalOrder> {}
