import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const calls: Array<{ table: string; operation: string; payload?: unknown }> = [];
  const productRow = {
    id: 'product-1',
    name: 'Cedar Mug',
    brand_id: null,
    short_description: null,
    is_active: false,
    is_featured: true,
    cover_media_asset_id: null,
  };
  const client = {
    from(table: string) {
      return {
        update(payload: unknown) {
          calls.push({ table, operation: 'update', payload });
          return {
            eq(_column: string, _value: string) {
              return {
                select() {
                  return {
                    single: () => Promise.resolve({ data: productRow, error: null }),
                  };
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

describe('Product update repository', () => {
  it('updates only the fields provided, with no financial fields', async () => {
    await expect(
      productCatalogRepository.updateProduct('product-1', {
        isActive: false,
        isFeatured: true,
      }),
    ).resolves.toEqual({
      id: 'product-1',
      name: 'Cedar Mug',
      brandId: null,
      shortDescription: null,
      isActive: false,
      isFeatured: true,
      coverMediaAssetId: null,
    });

    expect(testContext.calls).toEqual([
      {
        table: 'products',
        operation: 'update',
        payload: { is_active: false, is_featured: true },
      },
    ]);
  });

  it('supports clearing the Brand assignment (no Brand)', async () => {
    await productCatalogRepository.updateProduct('product-1', { brandId: null });

    expect(testContext.calls).toContainEqual({
      table: 'products',
      operation: 'update',
      payload: { brand_id: null },
    });
  });

  it('persists deliberate Product search keywords rather than leaving the database field unmanaged', async () => {
    await productCatalogRepository.updateProduct('product-1', {
      searchKeywords: ['berry', 'spark'],
    });

    expect(testContext.calls).toContainEqual({
      table: 'products',
      operation: 'update',
      payload: { search_keywords: ['berry', 'spark'] },
    });
  });
});
