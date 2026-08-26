import type { LocalOrder, OrdersDataContract } from '../types';

export const localOrders: readonly LocalOrder[] = [
  { id: '#K-1048', status: 'Preparing', total: '58.5 SAR', type: 'Customer pickup' },
  { id: '#K-1049', status: 'Completed', total: '42.0 SAR', type: 'Walk-in' },
  { id: '#K-1050', status: 'New', total: '35.0 SAR', type: 'Customer pickup' },
];

export const localOrdersContract: OrdersDataContract = {
  list: () => localOrders,
};
