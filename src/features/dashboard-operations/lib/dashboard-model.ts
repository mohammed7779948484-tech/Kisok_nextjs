export type DashboardInventoryRecord = {
  available: number;
  lowStockAt: number;
  sku: string;
};

export type DashboardOrderRecord = {
  amount: number;
  status: 'completed' | 'new' | 'preparing';
};

export function summarizeOperations(input: {
  inventory: DashboardInventoryRecord[];
  orders: DashboardOrderRecord[];
}) {
  return {
    grossSales: input.orders.reduce((total, order) => total + order.amount, 0),
    lowStockCount: input.inventory.filter((item) => item.available <= item.lowStockAt).length,
    openOrderCount: input.orders.filter((order) => order.status !== 'completed').length,
  };
}
