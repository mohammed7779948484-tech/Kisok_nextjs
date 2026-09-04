import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const calls: Array<{ operation: string; value?: string }> = [];
  let deleteResult: { error: { code?: string; message: string } | null } = { error: null };
  const client = {
    from(table: string) {
      calls.push({ operation: `from:${table}` });
      return {
        delete() {
          calls.push({ operation: 'delete' });
          return {
            eq(column: string, value: string) {
              calls.push({ operation: `eq:${column}`, value });
              return Promise.resolve(deleteResult);
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient<Database>;
  return {
    calls,
    client,
    setDeleteResult(value: { error: { code?: string; message: string } | null }) {
      deleteResult = value;
    },
  };
});

vi.mock('@/infrastructure/supabase/client/browser-client', () => ({
  getBrowserSupabaseClient: () => testContext.client,
}));

import { catalogTaxonomyRepository } from './index';

describe('Option Value deletion repository', () => {
  it('hard-deletes an Option Value with no Variant reference', async () => {
    testContext.setDeleteResult({ error: null });

    await expect(catalogTaxonomyRepository.deleteOptionValue('option-value-1')).resolves.toEqual({
      outcome: 'deleted',
    });
    expect(testContext.calls).toEqual([
      { operation: 'from:option_values' },
      { operation: 'delete' },
      { operation: 'eq:id', value: 'option-value-1' },
    ]);
  });

  it('reports an in-use-blocked hard deletion so the caller can offer deactivation instead', async () => {
    testContext.calls.splice(0);
    testContext.setDeleteResult({
      error: { code: '23503', message: 'product_variant_option_values_option_value_id_fkey' },
    });

    await expect(catalogTaxonomyRepository.deleteOptionValue('option-value-1')).resolves.toEqual({
      outcome: 'in-use',
      message:
        'This Option Value is still used by existing Variants and cannot be deleted — deactivate it instead.',
    });
  });
});
