import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

import type { ProductInput } from '../types';

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
                      id: 'product-2',
                      name: 'KISOK_TEST_Product',
                      brand_id: 'brand-1',
                      short_description: 'Operational description',
                      is_active: false,
                      is_featured: true,
                      cover_media_asset_id: null,
                      display_order: 1,
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

describe('Product Catalog write repository', () => {
  it('creates a Product with Lean V2 fields and no financial domain fields', async () => {
    await expect(
      productCatalogRepository.createProduct({
        name: 'KISOK_TEST_Product',
        brandId: 'brand-1',
        shortDescription: 'Operational description',
        isFeatured: true,
        coverMediaAssetId: 'media-1',
      } as ProductInput),
    ).resolves.toEqual({
      id: 'product-2',
      name: 'KISOK_TEST_Product',
      brandId: 'brand-1',
      shortDescription: 'Operational description',
      isActive: false,
      isFeatured: true,
      coverMediaAssetId: null,
    });
    expect(testContext.calls).toEqual([
      { operation: 'from:products' },
      {
        operation: 'insert',
        payload: {
          name: 'KISOK_TEST_Product',
          brand_id: 'brand-1',
          short_description: 'Operational description',
          is_featured: true,
          is_active: false,
          cover_media_asset_id: 'media-1',
          search_keywords: null,
        },
      },
    ]);
  });
});
