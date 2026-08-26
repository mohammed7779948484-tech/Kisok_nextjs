import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

type ExistingRow = { option_type_id: string; option_value_id: string };

function createClient(options: {
  existing: ExistingRow[];
  insertError?: Error;
  updateError?: Error;
  deleteError?: Error;
}) {
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
          return Promise.resolve({ error: options.insertError ?? null });
        },
        update(payload: unknown) {
          calls.push({ operation: 'update', payload });
          return {
            eq(column: string, value: string) {
              calls.push({ operation: `update-eq:${column}:${value}` });
              return {
                eq(column2: string, value2: string) {
                  calls.push({ operation: `update-eq:${column2}:${value2}` });
                  return Promise.resolve({ error: options.updateError ?? null });
                },
              };
            },
          };
        },
        delete() {
          calls.push({ operation: 'delete' });
          return {
            eq(column: string, value: string) {
              calls.push({ operation: `delete-eq:${column}:${value}` });
              return {
                eq(column2: string, value2: string) {
                  calls.push({ operation: `delete-eq:${column2}:${value2}` });
                  return Promise.resolve({ error: options.deleteError ?? null });
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

describe('Variant option relation repository', () => {
  it('rejects duplicate Option Types before touching the database', async () => {
    const { client, calls } = createClient({ existing: [] });
    testContext.client = client;

    await expect(
      productCatalogRepository.replaceVariantOptionValues('variant-1', [
        { optionTypeId: 'type-flavor', optionValueId: 'value-berry' },
        { optionTypeId: 'type-flavor', optionValueId: 'value-cherry' },
      ]),
    ).rejects.toThrow('A Variant can have at most one Value per Option Type.');
    expect(calls).toEqual([]);
  });

  it('inserts new Option Type selections for a Variant with no prior combination', async () => {
    const { client, calls } = createClient({ existing: [] });
    testContext.client = client;

    await productCatalogRepository.replaceVariantOptionValues('variant-1', [
      { optionTypeId: 'type-flavor', optionValueId: 'value-berry' },
      { optionTypeId: 'type-size', optionValueId: 'value-large' },
    ]);

    expect(calls).toContainEqual({
      operation: 'insert',
      payload: [
        { variant_id: 'variant-1', option_type_id: 'type-flavor', option_value_id: 'value-berry' },
        { variant_id: 'variant-1', option_type_id: 'type-size', option_value_id: 'value-large' },
      ],
    });
    expect(calls.filter((call) => call.operation === 'delete')).toEqual([]);
  });

  it('updates an existing Option Type in place instead of deleting and reinserting it', async () => {
    const { client, calls } = createClient({
      existing: [{ option_type_id: 'type-flavor', option_value_id: 'value-berry' }],
    });
    testContext.client = client;

    await productCatalogRepository.replaceVariantOptionValues('variant-1', [
      { optionTypeId: 'type-flavor', optionValueId: 'value-cherry' },
    ]);

    expect(calls).toContainEqual({
      operation: 'update',
      payload: { option_value_id: 'value-cherry' },
    });
    expect(calls.filter((call) => call.operation === 'delete')).toEqual([]);
    expect(calls.filter((call) => call.operation === 'insert')).toEqual([]);
  });

  it('removes only the Option Types explicitly dropped from the new selection', async () => {
    const { client, calls } = createClient({
      existing: [
        { option_type_id: 'type-flavor', option_value_id: 'value-berry' },
        { option_type_id: 'type-size', option_value_id: 'value-large' },
      ],
    });
    testContext.client = client;

    await productCatalogRepository.replaceVariantOptionValues('variant-1', [
      { optionTypeId: 'type-flavor', optionValueId: 'value-berry' },
    ]);

    expect(calls).toContainEqual({ operation: 'delete' });
    expect(calls).toContainEqual({ operation: 'delete-eq:option_type_id:type-size' });
    expect(calls.filter((call) => call.operation === 'update')).toEqual([]);
    expect(calls.filter((call) => call.operation === 'insert')).toEqual([]);
  });

  it('never loses the prior combination when a mid-way write fails', async () => {
    // Existing: flavor=berry, size=large. Desired: flavor=cherry (update),
    // color=red (new insert), size dropped (delete). The insert is made to
    // fail; the diff-based order runs insert first, so update/delete for the
    // surviving types must never be attempted, and the size row that would
    // have been deleted last is never touched.
    const { client, calls } = createClient({
      existing: [
        { option_type_id: 'type-flavor', option_value_id: 'value-berry' },
        { option_type_id: 'type-size', option_value_id: 'value-large' },
      ],
      insertError: new Error('option_value_id violates foreign key constraint'),
    });
    testContext.client = client;

    await expect(
      productCatalogRepository.replaceVariantOptionValues('variant-1', [
        { optionTypeId: 'type-flavor', optionValueId: 'value-cherry' },
        { optionTypeId: 'type-color', optionValueId: 'value-red' },
      ]),
    ).rejects.toThrow('option_value_id violates foreign key constraint');

    // The failed insert must be the only mutating call — no update for
    // flavor and no delete for size, so the old combination survives intact.
    expect(calls.filter((call) => call.operation === 'update')).toEqual([]);
    expect(calls.filter((call) => call.operation === 'delete')).toEqual([]);
  });
});
