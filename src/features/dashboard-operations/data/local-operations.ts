import type { ValueDataContract } from '@/shared/contracts';

import type { DashboardInventoryRecord, DashboardOrderRecord } from '../lib/dashboard-model';

export interface DashboardOperationsDataContract
  extends ValueDataContract<{
    inventory: DashboardInventoryRecord[];
    orders: DashboardOrderRecord[];
  }> {}

const localOperations = {
  inventory: [
    { available: 3, lowStockAt: 5, sku: 'ARABICA-250' },
    { available: 18, lowStockAt: 5, sku: 'CARDAMOM-60' },
    { available: 7, lowStockAt: 8, sku: 'MATCHA-30' },
  ],
  orders: [
    { amount: 58.5, status: 'preparing' as const },
    { amount: 42, status: 'completed' as const },
    { amount: 35, status: 'new' as const },
  ],
};

export const localOperationsContract: DashboardOperationsDataContract = {
  get: () => localOperations,
};
