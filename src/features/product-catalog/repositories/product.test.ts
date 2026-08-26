import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const calls: string[] = [];
  const client = {
    from(table: string) {
      calls.push(`from:${table}`);
      return {
        select(columns: string) {
          calls.push(`select:${columns}`);
          return {
            order(column: string, options: { ascending: boolean }) {
              calls.push(`order:${column}:${options.ascending}`);
              return Promise.resolve({
                data: [
                  {
                    id: 'product-1',
                    name: 'Berry Spark',
                    short_description: 'Single origin',
                    is_active: true,
                    is_featured: false,
                    brand_id: 'brand-1',
                    cover_media_asset_id: null,
                    display_order: 0,
                    search_keywords: null,
                    created_at: '2026-08-26T00:00:00Z',
                    updated_at: '2026-08-26T00:00:00Z',
                    brands: { name: 'Northline' },
                    product_variants: [
                      { id: 'variant-1', sku: 'KSK-000001', inventory: [{ current_quantity: 3 }] },
                      { id: 'variant-2', sku: 'KSK-000002', inventory: [{ current_quantity: 4 }] },
                    ],
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

import { productCatalogRepository } from './index';

describe('Product Catalog Supabase repository', () => {
  it('lists products with brand, variants, and operational stock aggregation', async () => {
    await expect(productCatalogRepository.listProducts()).resolves.toEqual([
      {
        id: 'product-1',
        name: 'Berry Spark',
        brandName: 'Northline',
        variantCount: 2,
        availableStock: 7,
        status: 'In stock',
        isActive: true,
        isFeatured: false,
      },
    ]);
    expect(testContext.calls).toEqual([
      'from:products',
      expect.stringMatching(/^select:/),
      'order:display_order:true',
    ]);
  });
});
