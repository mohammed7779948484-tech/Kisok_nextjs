import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const rows = [
    {
      option_type_id: 'type-flavor',
      option_value_id: 'value-berry',
      option_types: { name: 'Flavor' },
      option_values: { value: 'Berry' },
    },
    {
      option_type_id: 'type-size',
      option_value_id: 'value-large',
      option_types: { name: 'Size' },
      option_values: { value: 'Large' },
    },
  ];
  const client = {
    from(table: string) {
      if (table !== 'variant_option_values') throw new Error(`unexpected table ${table}`);
      return {
        select(_columns: string) {
          return {
            eq(_column: string, _value: string) {
              return Promise.resolve({ data: rows, error: null });
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

import { productCatalogRepository } from './index';

describe('Variant Option Value read repository', () => {
  it("lists a Variant's current Option Type/Value combination with display names", async () => {
    await expect(productCatalogRepository.listVariantOptionValues('variant-1')).resolves.toEqual([
      {
        optionTypeId: 'type-flavor',
        optionTypeName: 'Flavor',
        optionValueId: 'value-berry',
        optionValueName: 'Berry',
      },
      {
        optionTypeId: 'type-size',
        optionTypeName: 'Size',
        optionValueId: 'value-large',
        optionValueName: 'Large',
      },
    ]);
  });
});
