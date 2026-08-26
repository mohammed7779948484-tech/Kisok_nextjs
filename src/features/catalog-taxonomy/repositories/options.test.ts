import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const client = {
    from(table: string) {
      if (table !== 'option_types') throw new Error(`unexpected table ${table}`);
      return {
        select(_columns: string) {
          return {
            order(_column: string, _options: { ascending: boolean }) {
              return Promise.resolve({
                data: [
                  {
                    id: 'option-type-1',
                    name: 'Flavor',
                    is_active: true,
                    display_order: 0,
                    created_at: '2026-08-26T00:00:00Z',
                    updated_at: '2026-08-26T00:00:00Z',
                    option_values: [
                      {
                        id: 'option-value-1',
                        value: 'Berry',
                        is_active: true,
                        display_order: 0,
                      },
                    ],
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
  return { client };
});

vi.mock('@/infrastructure/supabase/client/browser-client', () => ({
  getBrowserSupabaseClient: () => testContext.client,
}));

import { catalogTaxonomyRepository } from './index';

describe('Option Library Supabase repository', () => {
  it('lists hosted Option Types with nested active Values', async () => {
    await expect(catalogTaxonomyRepository.listOptionTypes()).resolves.toEqual([
      {
        id: 'option-type-1',
        name: 'Flavor',
        isActive: true,
        displayOrder: 0,
        values: [{ id: 'option-value-1', value: 'Berry', isActive: true, displayOrder: 0 }],
      },
    ]);
  });
});
