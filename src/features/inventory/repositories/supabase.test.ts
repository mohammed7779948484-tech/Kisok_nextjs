import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const calls: string[] = [];
  const client = {
    from(table: string) {
      calls.push(`from:${table}`);
      if (table === 'store_settings') {
        return {
          select(columns: string) {
            calls.push(`select:${columns}`);
            return {
              single() {
                calls.push('single:true');
                return Promise.resolve({
                  data: { global_low_stock_threshold: 6 },
                  error: null,
                });
              },
            };
          },
        };
      }
      if (table === 'inventory_adjustments') {
        return {
          select(columns: string) {
            calls.push(`select:${columns}`);
            return {
              order(column: string, options: { ascending: boolean }) {
                calls.push(`order:${column}:${options.ascending}`);
                return Promise.resolve({
                  data: [
                    {
                      id: 'adj-1',
                      variant_id: 'variant-1',
                      adjustment_type: 'stock_received',
                      quantity_change: 10,
                      quantity_before: 0,
                      quantity_after: 10,
                      reason: 'Supplier shipment',
                      created_at: '2026-08-28T00:00:00Z',
                      product_variants: {
                        sku: 'KSK-000001',
                        title_override: 'Small Berry',
                        products: { name: 'Berry Spark' },
                        variant_option_values: [],
                      },
                    },
                  ],
                  error: null,
                });
              },
            };
          },
        };
      }
      return {
        select(columns: string) {
          calls.push(`select:${columns}`);
          return {
            order(column: string, options: { ascending: boolean }) {
              calls.push(`order:${column}:${options.ascending}`);
              return Promise.resolve({
                data: [
                  {
                    variant_id: 'variant-1',
                    current_quantity: 3,
                    product_variants: {
                      id: 'variant-1',
                      sku: 'KSK-000001',
                      barcode: null,
                      title_override: 'Small Berry',
                      low_stock_threshold: 4,
                      products: { id: 'product-1', name: 'Berry Spark' },
                      variant_option_values: [],
                    },
                  },
                  {
                    variant_id: 'variant-2',
                    current_quantity: 7,
                    product_variants: {
                      id: 'variant-2',
                      sku: 'KSK-000002',
                      barcode: '123',
                      title_override: null,
                      low_stock_threshold: null,
                      products: { id: 'product-2', name: 'Mint Water' },
                      variant_option_values: [],
                    },
                  },
                ],
                error: null,
              });
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient<Database>;

  return { calls, client };
});

vi.mock('@/infrastructure/supabase/client/browser-client', () => ({
  getBrowserSupabaseClient: () => testContext.client,
}));

import { inventoryRepository } from './index';

describe('Inventory Supabase repository', () => {
  it('reads inventory with product and variant identity and effective threshold', async () => {
    await expect(Promise.resolve(inventoryRepository.list())).resolves.toEqual([
      {
        variantId: 'variant-1',
        productId: 'product-1',
        productName: 'Berry Spark',
        variantName: 'Small Berry',
        sku: 'KSK-000001',
        barcode: null,
        currentQuantity: 3,
        lowStockThreshold: 4,
        isLowStock: true,
      },
      {
        variantId: 'variant-2',
        productId: 'product-2',
        productName: 'Mint Water',
        variantName: 'KSK-000002',
        sku: 'KSK-000002',
        barcode: '123',
        currentQuantity: 7,
        lowStockThreshold: 6,
        isLowStock: false,
      },
    ]);
  });

  it('reads inventory adjustment history with proper column mapping', async () => {
    await expect(Promise.resolve(inventoryRepository.listHistory())).resolves.toEqual([
      {
        id: 'adj-1',
        variantId: 'variant-1',
        productName: 'Berry Spark',
        variantName: 'Small Berry',
        sku: 'KSK-000001',
        type: 'stock_received',
        delta: 10,
        quantityBefore: 0,
        quantityAfter: 10,
        reason: 'Supplier shipment',
        createdAt: '2026-08-28T00:00:00Z',
      },
    ]);
  });
});
