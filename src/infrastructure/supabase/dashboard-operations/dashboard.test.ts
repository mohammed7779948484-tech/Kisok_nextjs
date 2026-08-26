import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import type { Database } from '../database.types';
import { getDashboardOperationalSnapshot } from './adapter';

type OrderRow = { id: string; display_number: string; status: string; created_at: string };

function createClient(options?: { missingStoreSettings?: boolean; orders?: OrderRow[] }) {
  const orders = options?.orders ?? [
    {
      id: 'order-new',
      display_number: 'ABC123',
      status: 'new',
      created_at: '2026-08-26T12:00:00Z',
    },
  ];

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
    orders,
    store_settings: options?.missingStoreSettings ? null : { global_low_stock_threshold: 7 },
  };

  const client = {
    from(table: string) {
      const source = (data as Record<string, unknown>)[table];

      function headCount(excluded?: string[]): number {
        if (table === 'orders' && excluded) {
          const rows = (source as OrderRow[] | undefined) ?? [];
          return rows.filter((row) => !excluded.includes(row.status)).length;
        }
        return table === 'brands' ? 4 : table === 'categories' ? 3 : 2;
      }

      const builder = {
        select(_columns: string, selectOptions?: { count?: string; head?: boolean }) {
          if (selectOptions?.head) {
            // A real Promise (not a hand-defined `then`) that also exposes
            // `.not()` for the one open-order-count query that filters
            // before resolving — mirrors supabase-js's thenable builder
            // without tripping lint/suspicious/noThenProperty.
            return Object.assign(Promise.resolve({ data: null, count: headCount(), error: null }), {
              not(_column: string, _operator: string, value: string) {
                const excluded = value.replace(/[()]/g, '').split(',');
                return Promise.resolve({ data: null, count: headCount(excluded), error: null });
              },
            });
          }
          return builder;
        },
        order(_column: string, _options: { ascending: boolean }) {
          return builder;
        },
        limit(count: number) {
          return Promise.resolve({
            data: (source as unknown[] | undefined)?.slice(0, count) ?? [],
            error: null,
          });
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

  it('counts every open order globally, not just the 5-row recent-orders slice', async () => {
    const manyOpenOrders: OrderRow[] = Array.from({ length: 8 }, (_, index) => ({
      id: `order-${index}`,
      display_number: `ORD${index}`,
      status: index % 3 === 0 ? 'preparing' : 'new',
      created_at: `2026-08-2${index}T12:00:00Z`,
    }));
    manyOpenOrders.push({
      id: 'order-final',
      display_number: 'FIN001',
      status: 'completed',
      created_at: '2026-08-26T12:00:00Z',
    });

    const result = await getDashboardOperationalSnapshot(createClient({ orders: manyOpenOrders }));

    expect(result.status).toBe('ready');
    // 8 open orders exist, but the recent-orders projection is capped at 5.
    expect(result.snapshot?.openOrderCount).toBe(8);
    expect(result.snapshot?.recentOrders).toHaveLength(5);
  });
});
