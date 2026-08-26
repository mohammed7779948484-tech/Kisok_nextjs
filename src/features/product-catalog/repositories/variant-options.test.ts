import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

type ExistingRow = { option_type_id: string; option_value_id: string };

function createClient(options: {
  existing: ExistingRow[];
  insertErrors?: Array<Error | null>;
  updateErrors?: Array<Error | null>;
  deleteErrors?: Array<Error | null>;
}) {
  const calls: Array<{ operation: string; payload?: unknown }> = [];
  let insertCallIndex = 0;
  let updateCallIndex = 0;
  let deleteCallIndex = 0;

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
          const error = options.insertErrors?.[insertCallIndex] ?? null;
          insertCallIndex += 1;
          return Promise.resolve({ error });
        },
        update(payload: unknown) {
          calls.push({ operation: 'update', payload });
          return {
            eq(column: string, value: string) {
              calls.push({ operation: `update-eq:${column}:${value}` });
              return {
                eq(column2: string, value2: string) {
                  calls.push({ operation: `update-eq:${column2}:${value2}` });
                  const error = options.updateErrors?.[updateCallIndex] ?? null;
                  updateCallIndex += 1;
                  return Promise.resolve({ error });
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
                  const error = options.deleteErrors?.[deleteCallIndex] ?? null;
                  deleteCallIndex += 1;
                  return Promise.resolve({ error });
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

  it('never loses the prior combination when the first write (insert) fails', async () => {
    const { client, calls } = createClient({
      existing: [
        { option_type_id: 'type-flavor', option_value_id: 'value-berry' },
        { option_type_id: 'type-size', option_value_id: 'value-large' },
      ],
      insertErrors: [new Error('option_value_id violates foreign key constraint')],
    });
    testContext.client = client;

    await expect(
      productCatalogRepository.replaceVariantOptionValues('variant-1', [
        { optionTypeId: 'type-flavor', optionValueId: 'value-cherry' },
        { optionTypeId: 'type-color', optionValueId: 'value-red' },
      ]),
    ).rejects.toThrow('option_value_id violates foreign key constraint');

    expect(calls.filter((call) => call.operation === 'update')).toEqual([]);
    expect(calls.filter((call) => call.operation === 'delete')).toEqual([]);
  });

  it('rolls back a successful insert when a later update fails, restoring the original combination', async () => {
    // Existing: flavor=berry, size=large. Desired: flavor=cherry (update,
    // will fail), color=red (insert, succeeds since inserts run first).
    // The insert must be undone (deleted back out) once the update fails —
    // otherwise the Variant is left with the new color but not the intended
    // flavor change: an unintended partial mixture.
    const { client, calls } = createClient({
      existing: [
        { option_type_id: 'type-flavor', option_value_id: 'value-berry' },
        { option_type_id: 'type-size', option_value_id: 'value-large' },
      ],
      updateErrors: [new Error('option_value_id violates foreign key constraint')],
    });
    testContext.client = client;

    await expect(
      productCatalogRepository.replaceVariantOptionValues('variant-1', [
        { optionTypeId: 'type-flavor', optionValueId: 'value-cherry' },
        { optionTypeId: 'type-color', optionValueId: 'value-red' },
        { optionTypeId: 'type-size', optionValueId: 'value-large' },
      ]),
    ).rejects.toThrow('option_value_id violates foreign key constraint');

    // The successful insert of type-color must be rolled back (deleted).
    expect(calls).toContainEqual({ operation: 'delete-eq:option_type_id:type-color' });
    // type-size was never part of the delete/removal set (still selected),
    // so it must never be touched, forward or rollback.
    expect(calls.filter((call) => call.operation === 'delete-eq:option_type_id:type-size')).toEqual(
      [],
    );
  });

  it('rolls back a successful insert and update when a later delete fails', async () => {
    // Existing: flavor=berry, size=large. Desired: flavor=cherry (update,
    // succeeds), color=red (insert, succeeds), size dropped (delete, fails).
    // Both the insert and the update must be undone so the Variant ends up
    // exactly where it started, not half-migrated.
    const { client, calls } = createClient({
      existing: [
        { option_type_id: 'type-flavor', option_value_id: 'value-berry' },
        { option_type_id: 'type-size', option_value_id: 'value-large' },
      ],
      deleteErrors: [new Error('unexpected constraint violation')],
    });
    testContext.client = client;

    await expect(
      productCatalogRepository.replaceVariantOptionValues('variant-1', [
        { optionTypeId: 'type-flavor', optionValueId: 'value-cherry' },
        { optionTypeId: 'type-color', optionValueId: 'value-red' },
      ]),
    ).rejects.toThrow('unexpected constraint violation');

    // Rollback of the insert: delete the newly-added type-color row.
    expect(calls).toContainEqual({ operation: 'delete-eq:option_type_id:type-color' });
    // Rollback of the update: revert type-flavor back to its original value.
    expect(calls).toContainEqual({
      operation: 'update',
      payload: { option_value_id: 'value-berry' },
    });
  });

  it('surfaces a combined error, not a silent single-sided one, when rollback itself also fails', async () => {
    // The update fails (main failure). Rollback must undo the successful
    // insert of type-color via delete — but that delete ALSO fails. Both
    // failures must be visible; neither may be silently swallowed.
    const { client } = createClient({
      existing: [{ option_type_id: 'type-flavor', option_value_id: 'value-berry' }],
      updateErrors: [new Error('original update failure')],
      deleteErrors: [new Error('rollback delete also failed')],
    });
    testContext.client = client;

    const rejection = productCatalogRepository.replaceVariantOptionValues('variant-1', [
      { optionTypeId: 'type-flavor', optionValueId: 'value-cherry' },
      { optionTypeId: 'type-color', optionValueId: 'value-red' },
    ]);

    await expect(rejection).rejects.toThrow(/original update failure/);
    await expect(rejection).rejects.toThrow(/rollback delete also failed/);
  });
});
