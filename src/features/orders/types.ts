export type OrderStatus = 'Completed' | 'New' | 'Preparing';

export interface LocalOrder {
  id: string;
  status: OrderStatus;
  total: string;
  type: string;
}

export interface OrdersDataContract {
  list(): readonly LocalOrder[];
}
