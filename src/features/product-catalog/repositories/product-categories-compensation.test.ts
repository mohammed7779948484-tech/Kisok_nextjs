import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const calls: string[] = [];
  let deleteCount = 0;
  const client = {
    from(table: string) {
      calls.push(`from:${table}`);
      return {
        select() {
          return {
            eq() {
              return Promise.resolve({ data: [{ category_id: 'category-old' }], error: null });
            },
          };
        },
        insert(payload: unknown) {
          calls.push(`insert:${JSON.stringify(payload)}`);
          return Promise.resolve({ error: null });
        },
        delete() {
          calls.push('delete');
          return {
            eq() {
              return {
                in(_column: string, values: string[]) {
                  deleteCount += 1;
                  calls.push(`delete-in:${values.join(',')}`);
                  return Promise.resolve({
                    error:
                      deleteCount === 1
                        ? { code: 'delete_failed', message: 'target relation could not be removed' }
                        : null,
                  });
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

import { productCatalogRepository } from './index';

describe('Product Category replacement compensation', () => {
  it('restores the previous relation set when a later removal fails after adding a Category', async () => {
    await expect(
      productCatalogRepository.setProductCategories('product-1', ['category-new']),
    ).rejects.toMatchObject({ message: 'target relation could not be removed' });

    expect(testContext.calls).toContain(
      'insert:[{"product_id":"product-1","category_id":"category-new"}]',
    );
    expect(testContext.calls.filter((call) => call === 'delete-in:category-new')).toHaveLength(1);
  });
});
