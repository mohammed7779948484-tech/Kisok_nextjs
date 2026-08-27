import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const calls: Array<{ operation: string; payload?: unknown }> = [];
  const client = {
    from(table: string) {
      calls.push({ operation: `from:${table}` });
      return {
        insert(payload: unknown) {
          calls.push({ operation: 'insert', payload });
          return {
            select(_columns: string) {
              return {
                single() {
                  return Promise.resolve({
                    data: {
                      id: 'variant-3',
                      product_id: 'product-2',
                      sku: 'KSK-000003',
                      barcode: null,
                      title_override: 'Berry Spark Single',
                      is_active: false,
                      low_stock_threshold: 5,
                      display_order: 2,
                      search_keywords: null,
                      created_at: '2026-08-26T00:00:00Z',
                      updated_at: '2026-08-26T00:00:00Z',
                    },
                    error: null,
                  });
                },
              };
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

import { productCatalogRepository } from './index';

describe('Product Variant repository', () => {
  it('creates a Variant with database-generated SKU and no financial fields', async () => {
    await expect(
      productCatalogRepository.createVariant({
        productId: 'product-2',
        titleOverride: 'Berry Spark Single',
        lowStockThreshold: 5,
      }),
    ).resolves.toEqual({
      id: 'variant-3',
      productId: 'product-2',
      sku: 'KSK-000003',
      barcode: null,
      titleOverride: 'Berry Spark Single',
      isActive: false,
      lowStockThreshold: 5,
    });
    expect(testContext.calls).toEqual([
      { operation: 'from:product_variants' },
      {
        operation: 'insert',
        payload: {
          product_id: 'product-2',
          is_active: false,
          title_override: 'Berry Spark Single',
          low_stock_threshold: 5,
        },
      },
    ]);
  });
});
