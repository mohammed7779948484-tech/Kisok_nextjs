import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import type { Database } from '../database.types';
import { getDashboardOperationalSnapshot } from './adapter';

type OrderRow = { id: string; display_number: string; status: string; created_at: string };
type ProductRow = { id: string; is_active: boolean };
type VariantRow = {
  id: string;
  product_id: string;
  is_active: boolean;
  low_stock_threshold: number | null;
};
type InventoryRow = { variant_id: string; current_quantity: number };

type Filter = { col: string; op: 'eq' | 'lte' | 'not_in'; val: unknown };

function buildCatalog(
  count: number,
  options?: { outOfStock?: boolean; lowStockThreshold?: number },
): { products: ProductRow[]; variants: VariantRow[]; inventory: InventoryRow[] } {
  const products: ProductRow[] = [];
  const variants: VariantRow[] = [];
  const inventory: InventoryRow[] = [];

  for (let index = 0; index < count; index += 1) {
    const productId = `product-${index}`;
    const variantId = `variant-${index}`;
    products.push({ id: productId, is_active: true });
    variants.push({
      id: variantId,
      product_id: productId,
      is_active: true,
      low_stock_threshold: options?.lowStockThreshold ?? 5,
    });
    inventory.push({
      variant_id: variantId,
      current_quantity: options?.outOfStock ? 0 : 5,
    });
  }

  return { products, variants, inventory };
}

function createClient(options?: {
  missingStoreSettings?: boolean;
  orders?: OrderRow[];
  products?: ProductRow[];
  variants?: VariantRow[];
  inventory?: InventoryRow[];
  globalLowStockThreshold?: number;
}) {
  const products = options?.products ?? [
    { id: 'product-active', is_active: true },
    { id: 'product-off', is_active: false },
  ];
  const variants = options?.variants ?? [
    {
      id: 'variant-active',
      product_id: 'product-active',
      is_active: true,
      low_stock_threshold: 2,
    },
    { id: 'variant-off', product_id: 'product-off', is_active: true, low_stock_threshold: null },
  ];
  const inventory = options?.inventory ?? [
    { variant_id: 'variant-active', current_quantity: 2 },
    { variant_id: 'variant-off', current_quantity: 0 },
  ];
  const orders = options?.orders ?? [
    {
      id: 'order-new',
      display_number: 'ABC123',
      status: 'new',
      created_at: '2026-08-26T12:00:00Z',
    },
  ];
  const globalLowStockThreshold = options?.globalLowStockThreshold ?? 7;

  const productsById = new Map(products.map((product) => [product.id, product]));
  const inventoryByVariant = new Map(inventory.map((item) => [item.variant_id, item]));

  function joinedVariants() {
    return variants.map((variant) => ({
      ...variant,
      products: productsById.get(variant.product_id) ?? null,
      inventory: inventoryByVariant.get(variant.id) ?? null,
    }));
  }

  function rawRows(table: string): unknown[] {
    if (table === 'products') return products;
    if (table === 'product_variants') return joinedVariants();
    if (table === 'inventory') return inventory;
    if (table === 'orders') return orders;
    if (table === 'brands') return Array.from({ length: 4 }, (_, i) => ({ id: `brand-${i}` }));
    if (table === 'categories') return Array.from({ length: 3 }, (_, i) => ({ id: `cat-${i}` }));
    if (table === 'media_assets')
      return Array.from({ length: 2 }, (_, i) => ({ id: `media-${i}` }));
    if (table === 'inventory_adjustments')
      return Array.from({ length: 2 }, (_, i) => ({ id: `adj-${i}` }));
    return [];
  }

  function getFieldValue(row: Record<string, unknown>, col: string): unknown {
    if (col.includes('.')) {
      const [rel, field] = col.split('.');
      const nested = row[rel] as Record<string, unknown> | null | undefined;
      return nested?.[field];
    }
    return row[col];
  }

  function applyFilters(rows: unknown[], filters: Filter[]): unknown[] {
    return rows.filter((row) =>
      filters.every((filter) => {
        const value = getFieldValue(row as Record<string, unknown>, filter.col);
        if (filter.op === 'eq') return value === filter.val;
        if (filter.op === 'lte')
          return typeof value === 'number' && value <= (filter.val as number);
        if (filter.op === 'not_in') return !(filter.val as string[]).includes(value as string);
        return true;
      }),
    );
  }

  const client = {
    from(table: string) {
      const filters: Filter[] = [];
      let selectOptions: { count?: string; head?: boolean } | undefined;
      let limitCount: number | undefined;
      let rangeFrom: number | undefined;
      let rangeTo: number | undefined;
      let wantMaybeSingle = false;

      function resolve() {
        if (wantMaybeSingle) {
          if (table === 'store_settings') {
            return {
              data: options?.missingStoreSettings
                ? null
                : { global_low_stock_threshold: globalLowStockThreshold },
              error: null,
            };
          }
          return { data: null, error: null };
        }

        if (selectOptions?.head) {
          const rows = applyFilters(rawRows(table), filters);
          return { data: null, count: rows.length, error: null };
        }

        let rows = applyFilters(rawRows(table), filters);
        if (rangeFrom !== undefined && rangeTo !== undefined) {
          rows = rows.slice(rangeFrom, rangeTo + 1);
        } else if (limitCount !== undefined) {
          rows = rows.slice(0, limitCount);
        }
        return { data: rows, error: null };
      }

      // A real Promise (via Object.assign), not a plain object defining its
      // own `then` — `resolve()` is deferred into a microtask so it always
      // runs after every synchronous `.eq()/.range()/...` chain call has
      // already recorded its filter, exactly mirroring how `await` on a
      // genuine PostgREST builder behaves.
      const builder = Object.assign(
        Promise.resolve().then(() => resolve()),
        {
          select(_columns: string, opts?: { count?: string; head?: boolean }) {
            selectOptions = opts;
            return builder;
          },
          eq(col: string, val: unknown) {
            filters.push({ col, op: 'eq', val });
            return builder;
          },
          lte(col: string, val: unknown) {
            filters.push({ col, op: 'lte', val });
            return builder;
          },
          not(col: string, _operator: string, val: string) {
            const excluded = val.replace(/[()]/g, '').split(',');
            filters.push({ col, op: 'not_in', val: excluded });
            return builder;
          },
          order(_column: string, _opts: { ascending: boolean }) {
            return builder;
          },
          limit(count: number) {
            limitCount = count;
            return builder;
          },
          range(from: number, to: number) {
            rangeFrom = from;
            rangeTo = to;
            return builder;
          },
          maybeSingle() {
            wantMaybeSingle = true;
            return builder;
          },
        },
      );
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

  it('counts active products, variants, and low-stock items exactly beyond the old 1000-row cap', async () => {
    const { products, variants, inventory } = buildCatalog(1500);

    const result = await getDashboardOperationalSnapshot(
      createClient({ products, variants, inventory }),
    );

    expect(result.status).toBe('ready');
    expect(result.snapshot?.activeProductCount).toBe(1500);
    expect(result.snapshot?.variantCount).toBe(1500);
    expect(result.snapshot?.lowStockCount).toBe(1500);
    expect(result.snapshot?.unavailableVariantCount).toBe(0);
  });

  it('paginates low-stock candidates across exact page-size boundaries without dropping or duplicating rows', async () => {
    const { products, variants, inventory } = buildCatalog(2000);

    const result = await getDashboardOperationalSnapshot(
      createClient({ products, variants, inventory }),
    );

    expect(result.status).toBe('ready');
    expect(result.snapshot?.lowStockCount).toBe(2000);
  });

  it('counts unavailable (zero-quantity) variants exactly beyond the old 1000-row cap', async () => {
    const { products, variants, inventory } = buildCatalog(1200, { outOfStock: true });

    const result = await getDashboardOperationalSnapshot(
      createClient({ products, variants, inventory }),
    );

    expect(result.status).toBe('ready');
    expect(result.snapshot?.unavailableVariantCount).toBe(1200);
  });
});
