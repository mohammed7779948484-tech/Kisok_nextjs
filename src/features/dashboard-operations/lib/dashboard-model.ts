export type DashboardInventoryRecord = {
  available: number;
  lowStockAt: number;
  sku: string;
};

export type DashboardOrderRecord = {
  status: 'cancelled' | 'completed' | 'new' | 'preparing' | 'ready';
};

export type DashboardProductRecord = {
  isActive: boolean;
};

export type DashboardVariantRecord = {
  available: number;
};

export function resolveLowStockThreshold(
  variantThreshold: number | null,
  globalThreshold: number,
): number {
  return variantThreshold ?? globalThreshold;
}

export function summarizeOperations(input: {
  inventory: DashboardInventoryRecord[];
  orders: DashboardOrderRecord[];
  products: DashboardProductRecord[];
  variants: DashboardVariantRecord[];
}) {
  return {
    activeProductCount: input.products.filter((product) => product.isActive).length,
    lowStockCount: input.inventory.filter((item) => item.available <= item.lowStockAt).length,
    openOrderCount: input.orders.filter(
      (order) => !['cancelled', 'completed'].includes(order.status),
    ).length,
    unavailableVariantCount: input.variants.filter((variant) => variant.available <= 0).length,
  };
}
