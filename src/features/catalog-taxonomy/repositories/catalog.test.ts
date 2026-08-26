import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const calls: Array<{ operation: string; payload?: unknown }> = [];
  const client = {
    from(table: string) {
      calls.push({ operation: `from:${table}` });
      return {
        select(columns: string) {
          calls.push({ operation: `select:${columns}` });
          return {
            ilike(column: string, value: string) {
              calls.push({ operation: `ilike:${column}:${value}` });
              return this;
            },
            order(column: string, options: { ascending: boolean }) {
              calls.push({ operation: `order:${column}:${options.ascending}` });
              return Promise.resolve({
                data: [
                  {
                    id: 'brand-1',
                    name: 'Northline',
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

describe('Brands Supabase repository', () => {
  it('lists searchable Brands from the real table ordered by display order', async () => {
    await expect(catalogTaxonomyRepository.listBrands('north')).resolves.toEqual([
      {
        id: 'brand-1',
        name: 'Northline',
        isActive: true,
        displayOrder: 0,
        imageMediaAssetId: null,
      },
    ]);
    expect(testContext.calls).toEqual([
      { operation: 'from:brands' },
      { operation: expect.stringMatching(/^select:/) },
      { operation: 'ilike:name:%north%' },
      { operation: 'order:display_order:true' },
    ]);
  });
});
