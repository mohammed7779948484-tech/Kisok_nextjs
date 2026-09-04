import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const calls: Array<{ operation: string; payload?: unknown }> = [];
  const category = {
    id: 'category-1',
    name: 'Coffee',
    parent_id: null,
    is_active: true,
    display_order: 0,
    image_media_asset_id: null,
    created_at: '2026-08-26T00:00:00Z',
    updated_at: '2026-08-26T00:00:00Z',
  };
  const client = {
    from(table: string) {
      calls.push({ operation: `from:${table}` });
      return {
        select(columns: string) {
          calls.push({ operation: `select:${columns}` });
          return {
            order(column: string, options: { ascending: boolean }) {
              calls.push({ operation: `order:${column}:${options.ascending}` });
              return Promise.resolve({ data: [category], error: null });
            },
            single() {
              return Promise.resolve({ data: category, error: null });
            },
          };
        },
        insert(payload: unknown) {
          calls.push({ operation: 'insert', payload });
          return {
            select() {
              return { single: () => Promise.resolve({ data: category, error: null }) };
            },
          };
        },
        update(payload: unknown) {
          calls.push({ operation: 'update', payload });
          return {
            eq(column: string, value: string) {
              calls.push({ operation: `eq:${column}:${value}` });
              return {
                select() {
                  return { single: () => Promise.resolve({ data: category, error: null }) };
                },
              };
            },
          };
        },
      };
    },
    rpc(name: string, payload: unknown) {
      calls.push({ operation: `rpc:${name}`, payload });
      return Promise.resolve({ data: null, error: null });
    },
  } as unknown as SupabaseClient<Database>;

  return { calls, client };
});

vi.mock('@/infrastructure/supabase/client/browser-client', () => ({
  getBrowserSupabaseClient: () => testContext.client,
}));

import { catalogTaxonomyRepository } from './index';

describe('Categories Supabase repository', () => {
  it('lists hosted Categories in display order with hierarchy fields', async () => {
    await expect(catalogTaxonomyRepository.listCategories()).resolves.toEqual([
      {
        id: 'category-1',
        name: 'Coffee',
        parentId: null,
        isActive: true,
        displayOrder: 0,
        imageMediaAssetId: null,
      },
    ]);
    expect(testContext.calls).toEqual([
      { operation: 'from:categories' },
      { operation: expect.stringMatching(/^select:/) },
      { operation: 'order:display_order:true' },
    ]);
    testContext.calls.length = 0;
  });

  it('creates and updates a hosted Category with an optional parent', async () => {
    await expect(
      catalogTaxonomyRepository.createCategory({ name: 'Cold Drinks', parentId: 'category-1' }),
    ).resolves.toMatchObject({ id: 'category-1', name: 'Coffee' });

    await expect(
      catalogTaxonomyRepository.updateCategory('category-1', {
        name: 'Hot Coffee',
        parentId: null,
        isActive: false,
      }),
    ).resolves.toMatchObject({ id: 'category-1' });

    expect(testContext.calls).toEqual([
      { operation: 'from:categories' },
      { operation: 'insert', payload: { name: 'Cold Drinks', parent_id: 'category-1' } },
      { operation: 'from:categories' },
      { operation: 'update', payload: { name: 'Hot Coffee', parent_id: null, is_active: false } },
      { operation: 'eq:id:category-1' },
    ]);
    testContext.calls.length = 0;
  });

  it('reorders a complete Category scope through the hosted RPC', async () => {
    await expect(
      catalogTaxonomyRepository.reorderCategories('category-1', ['category-2', 'category-3']),
    ).resolves.toBeUndefined();

    expect(testContext.calls).toEqual([
      {
        operation: 'rpc:reorder_items',
        payload: {
          resource_name: 'categories',
          scope_id: 'category-1',
          ordered_ids: ['category-2', 'category-3'],
        },
      },
    ]);
  });
});
