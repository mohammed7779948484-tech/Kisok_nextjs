import { describe, expect, it } from 'vitest';

import { summarizeOperations } from './dashboard-model';

describe('summarizeOperations', () => {
  it('counts low stock, open orders, active products, and unavailable variants', () => {
    const summary = summarizeOperations({
      inventory: [
        { available: 3, lowStockAt: 5, sku: 'KSK-000001' },
        { available: 18, lowStockAt: 5, sku: 'KSK-000002' },
      ],
      orders: [{ status: 'preparing' }, { status: 'completed' }, { status: 'new' }],
      products: [{ isActive: true }, { isActive: false }],
      variants: [{ available: 0 }, { available: 4 }],
    });

    expect(summary).toEqual({
      activeProductCount: 1,
      lowStockCount: 1,
      openOrderCount: 2,
      unavailableVariantCount: 1,
    });
  });
});
