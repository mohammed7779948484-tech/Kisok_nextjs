import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => ({
  insertCalls: [] as unknown[],
  deleteEqCalls: [] as unknown[][],
  updateCalls: [] as { payload: unknown; eqCalls: unknown[][] }[],
  rpcCalls: [] as unknown[],
  variantMediaRows: [] as unknown[],
  client: {
    from(table: string) {
      if (table === 'product_variant_media') {
        return {
          select(_columns: string) {
            return {
              eq(_column: string, _variantId: string) {
                return {
                  order: async () => ({ data: testContext.variantMediaRows, error: null }),
                };
              },
            };
          },
          insert(payload: unknown) {
            testContext.insertCalls.push(payload);
            return Promise.resolve({ error: null });
          },
          delete() {
            return {
              eq(...firstArgs: unknown[]) {
                testContext.deleteEqCalls.push(firstArgs);
                return {
                  eq(...secondArgs: unknown[]) {
                    testContext.deleteEqCalls.push(secondArgs);
                    return Promise.resolve({ error: null });
                  },
                };
              },
            };
          },
          update(payload: unknown) {
            const record = { payload, eqCalls: [] as unknown[][] };
            testContext.updateCalls.push(record);
            return {
              eq(...firstArgs: unknown[]) {
                record.eqCalls.push(firstArgs);
                return {
                  eq(...secondArgs: unknown[]) {
                    record.eqCalls.push(secondArgs);
                    return Promise.resolve({ error: null });
                  },
                };
              },
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    rpc(name: string, args: unknown) {
      testContext.rpcCalls.push({ name, args });
      return Promise.resolve({ data: null, error: null });
    },
  } as unknown as SupabaseClient<Database>,
}));

vi.mock('@/infrastructure/supabase/client/browser-client', () => ({
  getBrowserSupabaseClient: () => testContext.client,
}));

import { mediaLibraryRepository } from './index';

describe('Media Library Supabase repository — Variant Media', () => {
  it('lists Variant Media joined with its Media Asset for display', async () => {
    testContext.variantMediaRows = [
      {
        variant_id: 'variant-1',
        media_asset_id: 'media-1',
        display_order: 10,
        is_primary: true,
        created_at: '2026-08-26T00:00:00Z',
        media_assets: {
          public_id: 'kisok/test/asset',
          secure_url: 'https://res.cloudinary.com/example/image/upload/test',
          width: 640,
          height: 480,
          format: 'webp',
        },
      },
    ];

    await expect(mediaLibraryRepository.listVariantMedia('variant-1')).resolves.toEqual([
      {
        variantId: 'variant-1',
        mediaAssetId: 'media-1',
        displayOrder: 10,
        isPrimary: true,
        createdAt: '2026-08-26T00:00:00Z',
        asset: {
          publicId: 'kisok/test/asset',
          secureUrl: 'https://res.cloudinary.com/example/image/upload/test',
          width: 640,
          height: 480,
          format: 'webp',
        },
      },
    ]);
  });

  it('attaches a Media Asset to a Variant by inserting the join row', async () => {
    await mediaLibraryRepository.attachVariantMedia('variant-1', 'media-1');
    expect(testContext.insertCalls).toEqual([
      { variant_id: 'variant-1', media_asset_id: 'media-1' },
    ]);
  });

  it('detaches only the join row, never the underlying Media Asset', async () => {
    await mediaLibraryRepository.detachVariantMedia('variant-1', 'media-1');
    expect(testContext.deleteEqCalls).toEqual([
      ['variant_id', 'variant-1'],
      ['media_asset_id', 'media-1'],
    ]);
  });

  it('sets a new primary by unsetting the previous primary before setting the new one', async () => {
    await mediaLibraryRepository.setPrimaryVariantMedia('variant-1', 'media-2');

    expect(testContext.updateCalls).toHaveLength(2);
    expect(testContext.updateCalls[0].payload).toEqual({ is_primary: false });
    expect(testContext.updateCalls[0].eqCalls).toEqual([
      ['variant_id', 'variant-1'],
      ['is_primary', true],
    ]);
    expect(testContext.updateCalls[1].payload).toEqual({ is_primary: true });
    expect(testContext.updateCalls[1].eqCalls).toEqual([
      ['variant_id', 'variant-1'],
      ['media_asset_id', 'media-2'],
    ]);
  });

  it('reorders Variant Media through the shared reorder_items RPC', async () => {
    await mediaLibraryRepository.reorderVariantMedia('variant-1', ['media-2', 'media-1']);
    expect(testContext.rpcCalls).toEqual([
      {
        name: 'reorder_items',
        args: {
          resource_name: 'variant_media',
          scope_id: 'variant-1',
          ordered_ids: ['media-2', 'media-1'],
        },
      },
    ]);
  });
});
