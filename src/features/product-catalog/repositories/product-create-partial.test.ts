import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

import { createProductCatalogRepository } from './supabase';

describe('Product Catalog draft creation', () => {
  it('retains and identifies the created draft when category assignment fails instead of hiding a partial write', async () => {
    const deleteProduct = vi.fn();
    const categoryError = new Error('Category assignment rejected.');
    const client = {
      from(table: string) {
        if (table === 'products') {
          return {
            delete: vi.fn(() => ({
              eq: deleteProduct.mockResolvedValue({ error: null }),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    brand_id: null,
                    cover_media_asset_id: null,
                    id: 'product-1',
                    is_active: false,
                    is_featured: false,
                    name: 'Citrus Spark',
                    search_keywords: null,
                    short_description: null,
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'product_categories') {
          return {
            insert: vi.fn().mockResolvedValue({ error: categoryError }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    } as unknown as SupabaseClient<Database>;

    await expect(
      createProductCatalogRepository(client).createProduct({
        categoryIds: ['category-1'],
        name: 'Citrus Spark',
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining('saved as an inactive draft'),
      productId: 'product-1',
    });

    expect(deleteProduct).not.toHaveBeenCalled();
  });
});
