import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const calls: Array<{ operation: string; payload?: unknown }> = [];
  const client = {
    from(table: string) {
      calls.push({ operation: `from:${table}` });
      return {
        insert(payload: unknown) {
          calls.push({ operation: 'insert', payload });
          return {
            select(columns: string) {
              calls.push({ operation: `select:${columns}` });
              return {
                single() {
                  calls.push({ operation: 'single:true' });
                  return Promise.resolve({
                    data: {
                      id: 'brand-2',
                      name: 'KISOK_TEST_Brand',
                      is_active: true,
                      display_order: 1,
                      image_media_asset_id: null,
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

import { catalogTaxonomyRepository } from './index';

describe('Brands Supabase CRUD repository', () => {
  it('creates a Brand with only Lean V2 fields and returns its persisted identity', async () => {
    await expect(
      catalogTaxonomyRepository.createBrand({ name: 'KISOK_TEST_Brand' }),
    ).resolves.toEqual({
      id: 'brand-2',
      name: 'KISOK_TEST_Brand',
      isActive: true,
      displayOrder: 1,
      imageMediaAssetId: null,
    });
    expect(testContext.calls).toEqual([
      { operation: 'from:brands' },
      { operation: 'insert', payload: { name: 'KISOK_TEST_Brand' } },
      { operation: expect.stringMatching(/^select:/) },
      { operation: 'single:true' },
    ]);
  });
});
