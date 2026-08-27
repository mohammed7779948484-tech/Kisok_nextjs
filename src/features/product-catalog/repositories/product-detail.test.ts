import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const calls: Array<{ operation: string; value?: string }> = [];
  const client = {
    from(table: string) {
      calls.push({ operation: `from:${table}` });
      return {
        select(columns: string) {
          calls.push({ operation: `select:${columns}` });
          return {
            eq(column: string, value: string) {
              calls.push({ operation: `eq:${column}`, value });
              return {
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'product-1',
                      name: 'Berry Spark',
                      brand_id: 'brand-1',
                      short_description: 'Operational description',
                      is_active: false,
                      is_featured: true,
                      cover_media_asset_id: 'asset-1',
                      search_keywords: ['berry', 'spark'],
                      display_order: 1,
                      created_at: '2026-08-26T00:00:00Z',
                      updated_at: '2026-08-26T00:00:00Z',
                    },
                    error: null,
                  }),
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

describe('Product detail repository', () => {
  it('loads all editable Lean V2 Product fields by id without treating missing data as an empty Product', async () => {
    await expect(productCatalogRepository.getProduct('product-1')).resolves.toEqual({
      id: 'product-1',
      name: 'Berry Spark',
      brandId: 'brand-1',
      shortDescription: 'Operational description',
      isActive: false,
      isFeatured: true,
      coverMediaAssetId: 'asset-1',
      searchKeywords: ['berry', 'spark'],
    });
    expect(testContext.calls).toEqual([
      { operation: 'from:products' },
      { operation: expect.stringMatching(/^select:/) },
      { operation: 'eq:id', value: 'product-1' },
    ]);
  });
});
