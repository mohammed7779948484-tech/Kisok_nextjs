import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const variant = {
    id: 'variant-3',
    product_id: 'product-2',
    sku: 'KSK-000003',
    barcode: '0123456789',
    title_override: 'Berry Spark Single',
    is_active: true,
    low_stock_threshold: 5,
    display_order: 0,
    search_keywords: null,
    created_at: '2026-08-26T00:00:00Z',
    updated_at: '2026-08-26T00:00:00Z',
  };
  const client = {
    from(table: string) {
      if (table !== 'product_variants') throw new Error(`unexpected table ${table}`);
      return {
        select(_columns: string) {
          return {
            eq(_column: string, _value: string) {
              return {
                order() {
                  return Promise.resolve({ data: [variant], error: null });
                },
              };
            },
          };
        },
        update(payload: unknown) {
          return {
            eq(_column: string, _value: string) {
              return {
                select() {
                  return { single: () => Promise.resolve({ data: variant, error: null }) };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient<Database>;
  return { client };
});

vi.mock('@/infrastructure/supabase/client/browser-client', () => ({
  getBrowserSupabaseClient: () => testContext.client,
}));

import { productCatalogRepository } from './index';

describe('Product Variant hosted lifecycle', () => {
  it('lists Variants by Product with Lean operational fields', async () => {
    await expect(productCatalogRepository.listVariants('product-2')).resolves.toEqual([
      {
        id: 'variant-3',
        productId: 'product-2',
        sku: 'KSK-000003',
        barcode: '0123456789',
        titleOverride: 'Berry Spark Single',
        isActive: true,
        lowStockThreshold: 5,
      },
    ]);
  });

  it('updates a Variant without financial fields', async () => {
    await expect(
      productCatalogRepository.updateVariant('variant-3', {
        barcode: '9876543210',
        titleOverride: 'Updated title',
        lowStockThreshold: 8,
        isActive: false,
      }),
    ).resolves.toMatchObject({ id: 'variant-3' });
  });
});
