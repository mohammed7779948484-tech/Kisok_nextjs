import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import type { Database } from '../database.types';
import { getDashboardOperationalSnapshot } from './adapter';

function createClient(options?: { missingStoreSettings?: boolean }) {
  const data = {
    products: [
      { id: 'product-active', is_active: true },
      { id: 'product-off', is_active: false },
    ],
    product_variants: [
      {
        id: 'variant-active',
        product_id: 'product-active',
        is_active: true,
        low_stock_threshold: 2,
      },
      { id: 'variant-off', product_id: 'product-off', is_active: true, low_stock_threshold: null },
    ],
    inventory: [
      { variant_id: 'variant-active', current_quantity: 2 },
      { variant_id: 'variant-off', current_quantity: 0 },
    ],
    orders: [
      {
        id: 'order-new',
        display_number: 'ABC123',
        status: 'new',
        created_at: '2026-08-26T12:00:00Z',
      },
    ],
    store_settings: options?.missingStoreSettings ? null : { global_low_stock_threshold: 7 },
  };

  const client = {
    from(table: string) {
      const source = (data as Record<string, unknown>)[table];
      const builder = {
        select(_columns: string, options?: { count?: string; head?: boolean }) {
          if (options?.head) {
            return Promise.resolve({
              data: null,
              count: table === 'brands' ? 4 : table === 'categories' ? 3 : 2,
              error: null,
            });
          }
          return builder;
        },
        order(_column: string, _options: { ascending: boolean }) {
          return builder;
        },
        limit(_count: number) {
          return Promise.resolve({ data: source ?? [], error: null });
        },
        eq(_column: string, _value: unknown) {
          return builder;
        },
        maybeSingle() {
          return Promise.resolve({
            data: table === 'store_settings' && options?.missingStoreSettings ? null : source,
            error: null,
          });
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient<Database>;
  return client;
}

describe('Dashboard Supabase adapter', () => {
  it('uses active catalog semantics, exact adjustment counts, and effective thresholds', async () => {
    const result = await getDashboardOperationalSnapshot(createClient());

    expect(result).toEqual({
      status: 'ready',
      snapshot: expect.objectContaining({
        activeProductCount: 1,
        variantCount: 1,
        lowStockCount: 1,
        unavailableVariantCount: 0,
        inventoryAdjustmentCount: 2,
        openOrderCount: 1,
        recentOrders: [{ id: 'order-new', displayNumber: 'ABC123', status: 'new' }],
      }),
    });
  });

  it('keeps the overview operational when the optional settings singleton is absent', async () => {
    const result = await getDashboardOperationalSnapshot(
      createClient({ missingStoreSettings: true }),
    );

    expect(result.status).toBe('ready');
    expect(result.snapshot).toEqual(expect.objectContaining({ lowStockCount: 1 }));
  });
});
