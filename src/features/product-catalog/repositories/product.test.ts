import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

type ProductRow = {
  id: string;
  name: string;
  short_description: string | null;
  is_active: boolean;
  is_featured: boolean;
  brand_id: string | null;
  cover_media_asset_id: string | null;
  display_order: number;
  search_keywords: string | null;
  created_at: string;
  updated_at: string;
  brands: { name: string } | null;
  product_variants: Array<{
    id: string;
    sku: string;
    is_active: boolean;
    low_stock_threshold: number | null;
    inventory: Array<{ current_quantity: number }>;
  }>;
};

function createClient(options: { globalThreshold: number; products: ProductRow[] }) {
  const calls: string[] = [];
  const client = {
    from(table: string) {
      calls.push(`from:${table}`);
      if (table === 'store_settings') {
        return {
          select(columns: string) {
            calls.push(`select:${columns}`);
            return {
              maybeSingle() {
                calls.push('maybeSingle');
                return Promise.resolve({
                  data: { global_low_stock_threshold: options.globalThreshold },
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
            order(column: string, orderOptions: { ascending: boolean }) {
              calls.push(`order:${column}:${orderOptions.ascending}`);
              return Promise.resolve({ data: options.products, error: null });
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient<Database>;

  return { calls, client };
}

const testContext = vi.hoisted(() => ({ client: null as unknown }));

vi.mock('@/infrastructure/supabase/client/browser-client', () => ({
  getBrowserSupabaseClient: () => testContext.client,
}));

import { productCatalogRepository } from './index';

describe('Product Catalog Supabase repository', () => {
  it('lists products with brand, variants, and operational stock aggregation', async () => {
    const { client, calls } = createClient({
      globalThreshold: 2,
      products: [
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
            {
              id: 'variant-1',
              sku: 'KSK-000001',
              is_active: true,
              low_stock_threshold: null,
              inventory: [{ current_quantity: 3 }],
            },
            {
              id: 'variant-2',
              sku: 'KSK-000002',
              is_active: true,
              low_stock_threshold: null,
              inventory: [{ current_quantity: 4 }],
            },
          ],
        },
      ],
    });
    testContext.client = client;

    await expect(productCatalogRepository.listProducts()).resolves.toEqual([
      {
        id: 'product-1',
        name: 'Berry Spark',
        brandId: 'brand-1',
        brandName: 'Northline',
        shortDescription: 'Single origin',
        variantCount: 2,
        availableStock: 7,
        status: 'In stock',
        isActive: true,
        isFeatured: false,
      },
    ]);
    expect(calls).toEqual([
      'from:store_settings',
      expect.stringMatching(/^select:/),
      'maybeSingle',
      'from:products',
      expect.stringMatching(/^select:/),
      'order:display_order:true',
    ]);
  });

  it('reports Low stock using the effective per-variant/global threshold, not a hardcoded cutoff', async () => {
    const { client } = createClient({
      globalThreshold: 2,
      products: [
        {
          id: 'product-2',
          name: 'Cedar Roast',
          short_description: null,
          is_active: true,
          is_featured: false,
          brand_id: null,
          cover_media_asset_id: null,
          display_order: 1,
          search_keywords: null,
          created_at: '2026-08-26T00:00:00Z',
          updated_at: '2026-08-26T00:00:00Z',
          brands: null,
          product_variants: [
            {
              id: 'variant-3',
              sku: 'KSK-000003',
              is_active: true,
              // No variant override: falls back to the global threshold (2).
              // Quantity 1 is above the old hardcoded `<= 5` cutoff's "safe"
              // zone but at-or-below the real effective threshold.
              low_stock_threshold: null,
              inventory: [{ current_quantity: 1 }],
            },
          ],
        },
      ],
    });
    testContext.client = client;

    await expect(productCatalogRepository.listProducts()).resolves.toEqual([
      expect.objectContaining({ id: 'product-2', availableStock: 1, status: 'Low stock' }),
    ]);
  });

  it('honors a variant-specific threshold override above the global default', async () => {
    const { client } = createClient({
      globalThreshold: 0,
      products: [
        {
          id: 'product-3',
          name: 'Maple Blend',
          short_description: null,
          is_active: true,
          is_featured: false,
          brand_id: null,
          cover_media_asset_id: null,
          display_order: 2,
          search_keywords: null,
          created_at: '2026-08-26T00:00:00Z',
          updated_at: '2026-08-26T00:00:00Z',
          brands: null,
          product_variants: [
            {
              id: 'variant-4',
              sku: 'KSK-000004',
              is_active: true,
              // Global threshold is 0 (would say "In stock"), but this
              // variant overrides its own threshold to 10.
              low_stock_threshold: 10,
              inventory: [{ current_quantity: 8 }],
            },
          ],
        },
      ],
    });
    testContext.client = client;

    await expect(productCatalogRepository.listProducts()).resolves.toEqual([
      expect.objectContaining({ id: 'product-3', availableStock: 8, status: 'Low stock' }),
    ]);
  });

  describe('active Variant stock semantics (must match Dashboard, which already excludes inactive Variants)', () => {
    it('excludes an inactive Variant from available stock when an active Variant also exists', async () => {
      const { client } = createClient({
        globalThreshold: 2,
        products: [
          {
            id: 'product-5',
            name: 'Mixed Variant Product',
            short_description: null,
            is_active: true,
            is_featured: false,
            brand_id: null,
            cover_media_asset_id: null,
            display_order: 3,
            search_keywords: null,
            created_at: '2026-08-26T00:00:00Z',
            updated_at: '2026-08-26T00:00:00Z',
            brands: null,
            product_variants: [
              {
                id: 'variant-active',
                sku: 'KSK-000005',
                is_active: true,
                low_stock_threshold: null,
                inventory: [{ current_quantity: 10 }],
              },
              {
                id: 'variant-inactive',
                sku: 'KSK-000006',
                is_active: false,
                low_stock_threshold: null,
                // Discontinued Variant with leftover stock — must not count.
                inventory: [{ current_quantity: 999 }],
              },
            ],
          },
        ],
      });
      testContext.client = client;

      await expect(productCatalogRepository.listProducts()).resolves.toEqual([
        expect.objectContaining({
          id: 'product-5',
          variantCount: 1,
          availableStock: 10,
          status: 'In stock',
        }),
      ]);
    });

    it('does not count an inactive Variant with stock toward low-stock status', async () => {
      const { client } = createClient({
        globalThreshold: 50,
        products: [
          {
            id: 'product-6',
            name: 'Healthy Active, Stocked Inactive',
            short_description: null,
            is_active: true,
            is_featured: false,
            brand_id: null,
            cover_media_asset_id: null,
            display_order: 4,
            search_keywords: null,
            created_at: '2026-08-26T00:00:00Z',
            updated_at: '2026-08-26T00:00:00Z',
            brands: null,
            product_variants: [
              {
                id: 'variant-active',
                sku: 'KSK-000007',
                is_active: true,
                // Active variant's own threshold is low, so it reads healthy.
                low_stock_threshold: 1,
                inventory: [{ current_quantity: 20 }],
              },
              {
                id: 'variant-inactive',
                sku: 'KSK-000008',
                is_active: false,
                // Inactive variant has stock below the global threshold —
                // must not drag the product into "Low stock".
                low_stock_threshold: null,
                inventory: [{ current_quantity: 1 }],
              },
            ],
          },
        ],
      });
      testContext.client = client;

      await expect(productCatalogRepository.listProducts()).resolves.toEqual([
        expect.objectContaining({ id: 'product-6', availableStock: 20, status: 'In stock' }),
      ]);
    });

    it('does not count an inactive Variant with zero stock toward Out of stock', async () => {
      const { client } = createClient({
        globalThreshold: 2,
        products: [
          {
            id: 'product-7',
            name: 'Active Healthy, Inactive Empty',
            short_description: null,
            is_active: true,
            is_featured: false,
            brand_id: null,
            cover_media_asset_id: null,
            display_order: 5,
            search_keywords: null,
            created_at: '2026-08-26T00:00:00Z',
            updated_at: '2026-08-26T00:00:00Z',
            brands: null,
            product_variants: [
              {
                id: 'variant-active',
                sku: 'KSK-000009',
                is_active: true,
                low_stock_threshold: null,
                inventory: [{ current_quantity: 10 }],
              },
              {
                id: 'variant-inactive',
                sku: 'KSK-000010',
                is_active: false,
                low_stock_threshold: null,
                inventory: [{ current_quantity: 0 }],
              },
            ],
          },
        ],
      });
      testContext.client = client;

      await expect(productCatalogRepository.listProducts()).resolves.toEqual([
        expect.objectContaining({ id: 'product-7', availableStock: 10, status: 'In stock' }),
      ]);
    });

    it('reports Out of stock when every Variant is inactive, ignoring their stock entirely', async () => {
      const { client } = createClient({
        globalThreshold: 2,
        products: [
          {
            id: 'product-8',
            name: 'Fully Discontinued',
            short_description: null,
            is_active: true,
            is_featured: false,
            brand_id: null,
            cover_media_asset_id: null,
            display_order: 6,
            search_keywords: null,
            created_at: '2026-08-26T00:00:00Z',
            updated_at: '2026-08-26T00:00:00Z',
            brands: null,
            product_variants: [
              {
                id: 'variant-inactive-1',
                sku: 'KSK-000011',
                is_active: false,
                low_stock_threshold: null,
                inventory: [{ current_quantity: 50 }],
              },
              {
                id: 'variant-inactive-2',
                sku: 'KSK-000012',
                is_active: false,
                low_stock_threshold: null,
                inventory: [{ current_quantity: 25 }],
              },
            ],
          },
        ],
      });
      testContext.client = client;

      await expect(productCatalogRepository.listProducts()).resolves.toEqual([
        expect.objectContaining({
          id: 'product-8',
          variantCount: 0,
          availableStock: 0,
          status: 'Out of stock',
        }),
      ]);
    });
  });
});
