import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const calls: Array<{ operation: string; payload?: unknown }> = [];
  const client = {
    from(table: string) {
      calls.push({ operation: `from:${table}` });
      return {
        delete() {
          calls.push({ operation: 'delete' });
          return {
            eq(column: string, value: string) {
              calls.push({ operation: `eq:${column}:${value}` });
              return Promise.resolve({ error: null });
            },
          };
        },
        insert(payload: unknown) {
          calls.push({ operation: 'insert', payload });
          return Promise.resolve({ error: null });
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

describe('Variant option relation repository', () => {
  it('replaces a Variant option combination with typed Value/Type pairs', async () => {
    await expect(
      productCatalogRepository.replaceVariantOptionValues('variant-1', [
        { optionTypeId: 'type-flavor', optionValueId: 'value-berry' },
        { optionTypeId: 'type-size', optionValueId: 'value-large' },
      ]),
    ).resolves.toBeUndefined();

    expect(testContext.calls).toEqual([
      { operation: 'from:variant_option_values' },
      { operation: 'delete' },
      { operation: 'eq:variant_id:variant-1' },
      { operation: 'from:variant_option_values' },
      {
        operation: 'insert',
        payload: [
          {
            variant_id: 'variant-1',
            option_type_id: 'type-flavor',
            option_value_id: 'value-berry',
          },
          {
            variant_id: 'variant-1',
            option_type_id: 'type-size',
            option_value_id: 'value-large',
          },
        ],
      },
    ]);
  });
});
