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
    is_active: true,
    is_featured: false,
    cover_media_asset_id: null,
  };
  const client = {
    from(table: string) {
      return {
        insert(payload: unknown) {
          calls.push({ table, operation: 'insert', payload });
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
  } as unknown as SupabaseClient<Database>;
  return { calls, client };
});

vi.mock('@/infrastructure/supabase/client/browser-client', () => ({
  getBrowserSupabaseClient: () => testContext.client,
}));

import { productCatalogRepository } from './index';

describe('Product relation repository behavior', () => {
  it('persists Product Category assignments without primary or ranking fields', async () => {
    await productCatalogRepository.createProduct({
      name: 'Cedar Mug',
      categoryIds: ['category-1', 'category-2'],
    });

    expect(testContext.calls).toContainEqual({
      table: 'product_categories',
      operation: 'insert',
      payload: [
        { product_id: 'product-1', category_id: 'category-1' },
        { product_id: 'product-1', category_id: 'category-2' },
      ],
    });
  });
});
