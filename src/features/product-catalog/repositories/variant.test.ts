import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const calls: Array<{ operation: string; payload?: unknown }> = [];
  const client = {
    rpc(fn: string, payload: unknown) {
      calls.push({ operation: `rpc:${fn}`, payload });
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
  } as unknown as SupabaseClient<Database>;
  return { calls, client };
});

vi.mock('@/infrastructure/supabase/client/browser-client', () => ({
  getBrowserSupabaseClient: () => testContext.client,
}));

import { productCatalogRepository } from './index';

describe('Product Variant repository', () => {
  it('creates a Variant with database-generated SKU and no financial fields via atomic RPC', async () => {
    await expect(
      productCatalogRepository.createVariant({
        productId: 'product-2',
        titleOverride: 'Berry Spark Single',
        lowStockThreshold: 5,
        initialQuantity: 10,
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
      {
        operation: 'rpc:create_variant_with_initial_stock',
        payload: {
          product_id: 'product-2',
          barcode: null,
          title_override: 'Berry Spark Single',
          low_stock_threshold: 5,
          initial_quantity: 10,
        },
      },
    ]);
  });

  it('normalizes blank/omitted optional fields to null with no undefined RPC arguments', async () => {
    testContext.calls.length = 0;

    await productCatalogRepository.createVariant({
      productId: 'product-2',
      barcode: '   ',
      titleOverride: '',
      initialQuantity: 0,
    });

    expect(testContext.calls).toHaveLength(1);
    const call = testContext.calls[0];
    expect(call.operation).toBe('rpc:create_variant_with_initial_stock');

    const payload = call.payload as Record<string, unknown>;
    expect(payload).toEqual({
      product_id: 'product-2',
      barcode: null,
      title_override: null,
      low_stock_threshold: null,
      initial_quantity: 0,
    });

    // Explicitly verify all 5 keys are present and none are undefined
    expect(Object.keys(payload).sort()).toEqual([
      'barcode',
      'initial_quantity',
      'low_stock_threshold',
      'product_id',
      'title_override',
    ]);
    for (const [key, value] of Object.entries(payload)) {
      expect(value, `Arg ${key} must not be undefined`).not.toBeUndefined();
    }
  });
});
