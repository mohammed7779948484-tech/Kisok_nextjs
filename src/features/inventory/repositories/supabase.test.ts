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
                      low_stock_threshold: 4,
                      products: { id: 'product-1', name: 'Berry Spark' },
                    },
                  },
                  {
                    variant_id: 'variant-2',
                    current_quantity: 7,
                    product_variants: {
                      id: 'variant-2',
                      sku: 'KSK-000002',
                      barcode: '123',
                      low_stock_threshold: null,
                      products: { id: 'product-2', name: 'Mint Water' },
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
        sku: 'KSK-000002',
        barcode: '123',
        currentQuantity: 7,
        lowStockThreshold: 6,
        isLowStock: false,
      },
    ]);
    expect(testContext.calls).toEqual([
      'from:store_settings',
      'select:global_low_stock_threshold',
      'single:true',
      'from:inventory',
      expect.stringMatching(/^select:/),
      'order:current_quantity:true',
    ]);
  });
});
