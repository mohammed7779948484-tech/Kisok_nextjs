import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

function createClient(options: { existing: Array<{ category_id: string }> }) {
  const calls: Array<{ operation: string; payload?: unknown }> = [];
  const client = {
    from(table: string) {
      calls.push({ operation: `from:${table}` });
      return {
        select(columns: string) {
          calls.push({ operation: `select:${columns}` });
          return {
            eq(column: string, value: string) {
              calls.push({ operation: `select-eq:${column}:${value}` });
              return Promise.resolve({ data: options.existing, error: null });
            },
          };
        },
        insert(payload: unknown) {
          calls.push({ operation: 'insert', payload });
          return Promise.resolve({ error: null });
        },
        delete() {
          calls.push({ operation: 'delete' });
          return {
            eq(column: string, value: string) {
              calls.push({ operation: `delete-eq:${column}:${value}` });
              return {
                in(column2: string, values: string[]) {
                  calls.push({ operation: `delete-in:${column2}:${values.join(',')}` });
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient<Database>;
  return { calls, client };
}

const testContext = vi.hoisted(() => ({ client: null as unknown }));

vi.mock('@/infrastructure/supabase/client/browser-client', () => ({
  getBrowserSupabaseClient: () => testContext.client,
}));

import { productCatalogRepository } from './index';

describe('Product Category reassignment repository', () => {
  it('reads the current Category assignment for a Product', async () => {
    const { client } = createClient({ existing: [{ category_id: 'category-1' }] });
    testContext.client = client;

    await expect(productCatalogRepository.listProductCategoryIds('product-1')).resolves.toEqual([
      'category-1',
    ]);
  });

  it('adds newly selected Categories without touching ones already assigned', async () => {
    const { client, calls } = createClient({ existing: [{ category_id: 'category-1' }] });
    testContext.client = client;

    await productCatalogRepository.setProductCategories('product-1', ['category-1', 'category-2']);

    expect(calls).toContainEqual({
      operation: 'insert',
      payload: [{ product_id: 'product-1', category_id: 'category-2' }],
    });
    expect(calls.filter((call) => call.operation === 'delete')).toEqual([]);
  });

  it('removes Categories that are no longer selected', async () => {
    const { client, calls } = createClient({
      existing: [{ category_id: 'category-1' }, { category_id: 'category-2' }],
    });
    testContext.client = client;

    await productCatalogRepository.setProductCategories('product-1', ['category-1']);

    expect(calls).toContainEqual({ operation: 'delete' });
    expect(calls).toContainEqual({ operation: 'delete-eq:product_id:product-1' });
    expect(calls).toContainEqual({ operation: 'delete-in:category_id:category-2' });
    expect(calls.filter((call) => call.operation === 'insert')).toEqual([]);
  });

  it('does nothing when the selection is unchanged', async () => {
    const { client, calls } = createClient({ existing: [{ category_id: 'category-1' }] });
    testContext.client = client;

    await productCatalogRepository.setProductCategories('product-1', ['category-1']);

    expect(calls.filter((call) => call.operation === 'insert')).toEqual([]);
    expect(calls.filter((call) => call.operation === 'delete')).toEqual([]);
  });
});
