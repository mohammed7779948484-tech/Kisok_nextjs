import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const typeRow = {
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
  };
  const valueRow = {
    id: 'option-value-1',
    option_type_id: 'option-type-1',
    value: 'Berry',
    is_active: true,
    display_order: 0,
    created_at: '2026-08-26T00:00:00Z',
    updated_at: '2026-08-26T00:00:00Z',
  };
  const client = {
    from(table: string) {
      return {
        select(_columns: string) {
          return {
            order(_column: string, _options: { ascending: boolean }) {
              return Promise.resolve({ data: [typeRow], error: null });
            },
            single() {
              return Promise.resolve({
                data: table === 'option_types' ? typeRow : valueRow,
                error: null,
              });
            },
          };
        },
        insert(_payload: unknown) {
          return {
            select() {
              return {
                single: () =>
                  Promise.resolve({
                    data: table === 'option_types' ? typeRow : valueRow,
                    error: null,
                  }),
              };
            },
          };
        },
        update(_payload: unknown) {
          return {
            eq(_column: string, _value: string) {
              return {
                select() {
                  return { single: () => Promise.resolve({ data: valueRow, error: null }) };
                },
              };
            },
          };
        },
      };
    },
    rpc(_name: string, _payload: unknown) {
      return Promise.resolve({ data: null, error: null });
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

  it('creates and updates hosted Option Types and Values', async () => {
    await expect(
      catalogTaxonomyRepository.createOptionType({ name: 'Size' }),
    ).resolves.toMatchObject({ id: 'option-type-1' });
    await expect(
      catalogTaxonomyRepository.createOptionValue({
        optionTypeId: 'option-type-1',
        value: 'Large',
      }),
    ).resolves.toMatchObject({ id: 'option-value-1' });
    await expect(
      catalogTaxonomyRepository.updateOptionValue('option-value-1', { isActive: false }),
    ).resolves.toMatchObject({ id: 'option-value-1' });
  });

  it('reorders Values within their Option Type scope through the hosted RPC', async () => {
    await expect(
      catalogTaxonomyRepository.reorderOptionValues('option-type-1', [
        'option-value-2',
        'option-value-1',
      ]),
    ).resolves.toBeUndefined();
  });
});
