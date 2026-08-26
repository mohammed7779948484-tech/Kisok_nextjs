import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const calls: Array<{ operation: string; payload?: unknown }> = [];
  const client = {
    from(table: string) {
      calls.push({ operation: `from:${table}` });
      return {
        update(payload: unknown) {
          calls.push({ operation: 'update', payload });
          return {
            eq(column: string, value: string) {
              calls.push({ operation: `eq:${column}:${value}` });
              return {
                select(columns: string) {
                  calls.push({ operation: `select:${columns}` });
                  return {
                    single() {
                      calls.push({ operation: 'single:true' });
                      return Promise.resolve({
                        data: {
                          id: 'brand-1',
                          name: 'Northline Updated',
                          is_active: false,
                          display_order: 0,
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
      };
    },
  } as unknown as SupabaseClient<Database>;

  return { calls, client };
});

vi.mock('@/infrastructure/supabase/client/browser-client', () => ({
  getBrowserSupabaseClient: () => testContext.client,
}));

import { catalogTaxonomyRepository } from './index';

describe('Brands lifecycle repository', () => {
  it('updates Brand name and active state through the real table', async () => {
    await expect(
      catalogTaxonomyRepository.updateBrand('brand-1', {
        name: 'Northline Updated',
        isActive: false,
      }),
    ).resolves.toMatchObject({
      id: 'brand-1',
      name: 'Northline Updated',
      isActive: false,
    });
    expect(testContext.calls).toEqual([
      { operation: 'from:brands' },
      { operation: 'update', payload: { name: 'Northline Updated', is_active: false } },
      { operation: 'eq:id:brand-1' },
      { operation: expect.stringMatching(/^select:/) },
      { operation: 'single:true' },
    ]);
  });
});
