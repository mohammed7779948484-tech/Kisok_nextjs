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
                    id: 'category-1',
                    name: 'Coffee',
                    parent_id: null,
                    is_active: true,
                    display_order: 0,
                    image_media_asset_id: null,
                    created_at: '2026-08-26T00:00:00Z',
                    updated_at: '2026-08-26T00:00:00Z',
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

import { catalogTaxonomyRepository } from './index';

describe('Categories Supabase repository', () => {
  it('lists hosted Categories in display order with hierarchy fields', async () => {
    await expect(catalogTaxonomyRepository.listCategories()).resolves.toEqual([
      {
        id: 'category-1',
        name: 'Coffee',
        parentId: null,
        isActive: true,
        displayOrder: 0,
        imageMediaAssetId: null,
      },
    ]);
    expect(testContext.calls).toEqual([
      'from:categories',
      expect.stringMatching(/^select:/),
      'order:display_order:true',
    ]);
  });
});
