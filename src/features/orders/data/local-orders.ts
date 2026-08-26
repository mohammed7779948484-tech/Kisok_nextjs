import type { LocalOrder, OrdersDataContract } from '../types';

export const localOrders: readonly LocalOrder[] = [
  {
    id: 'KSK001',
    status: 'Preparing',
    itemCount: 2,
    createdAt: '09:24',
    customerLabel: 'Kiosk customer',
  },
  {
    id: 'KSK002',
    status: 'Completed',
    itemCount: 1,
    createdAt: '09:08',
    customerLabel: 'Kiosk customer',
  },
  {
    id: 'KSK003',
    status: 'New',
    itemCount: 3,
    createdAt: '08:56',
    customerLabel: 'Kiosk customer',
  },
];

export const localOrdersContract: OrdersDataContract = {
  list: () => localOrders,
};
