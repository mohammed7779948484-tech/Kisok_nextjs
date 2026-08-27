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

import { productCatalogRepository } from './index';

describe('Variant deletion repository', () => {
  it('hard-deletes a Variant where Lean V2 has no historical reference', async () => {
    testContext.setDeleteResult({ error: null });

    await expect(productCatalogRepository.deleteVariant('variant-1')).resolves.toEqual({
      outcome: 'deleted',
    });
    expect(testContext.calls).toEqual([
      { operation: 'from:product_variants' },
      { operation: 'delete' },
      { operation: 'eq:id', value: 'variant-1' },
    ]);
  });

  it('reports a history-blocked hard deletion so the caller can offer deactivation', async () => {
    testContext.calls.splice(0);
    testContext.setDeleteResult({
      error: { code: '23503', message: 'order_items_variant_id_fkey' },
    });

    await expect(productCatalogRepository.deleteVariant('variant-1')).resolves.toEqual({
      outcome: 'history-blocked',
      message: 'This Variant is referenced by historical orders and cannot be deleted.',
    });
  });
});
