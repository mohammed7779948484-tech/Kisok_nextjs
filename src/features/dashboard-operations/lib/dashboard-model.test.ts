import { describe, expect, it } from 'vitest';

import { summarizeOperations } from './dashboard-model';

describe('summarizeOperations', () => {
  it('counts open orders, at-risk stock, and gross sales from local dashboard records', () => {
    const summary = summarizeOperations({
      inventory: [
        { available: 3, lowStockAt: 5, sku: 'ARABICA-250' },
        { available: 18, lowStockAt: 5, sku: 'CARDAMOM-60' },
      ],
      orders: [
        { amount: 58.5, status: 'preparing' },
        { amount: 42, status: 'completed' },
        { amount: 35, status: 'new' },
      ],
    });

    expect(summary).toEqual({
      grossSales: 135.5,
      lowStockCount: 1,
      openOrderCount: 2,
    });
  });
});
