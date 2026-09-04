import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const calls: Array<{ operation: string; payload?: unknown }> = [];
  const client = {
    from(table: string) {
      calls.push({ operation: `from:${table}` });
      return {
        select(_columns: string) {
          return {
            single() {
              return Promise.resolve({
                data: {
                  id: true,
                  store_name: 'KISOK',
                  global_low_stock_threshold: 5,
                  customer_success_reset_seconds: 60,
                  store_timezone: 'UTC',
                  logo_media_asset_id: null,
                },
                error: null,
              });
            },
          };
        },
        update(payload: unknown) {
          calls.push({ operation: 'update', payload });
          return {
            eq(column: string, value: boolean) {
              calls.push({ operation: `eq:${column}:${value}` });
              return {
                select(_columns: string) {
                  return {
                    single() {
                      return Promise.resolve({
                        data: {
                          id: true,
                          store_name: 'KISOK Updated',
                          global_low_stock_threshold: 8,
                          customer_success_reset_seconds: 90,
                          store_timezone: 'UTC',
                          logo_media_asset_id: null,
                        },
                        error: null,
                      });
                    },
                  };
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

import { storeSettingsRepository } from './index';

describe('Store Settings Supabase repository', () => {
  it('reads and updates the Lean V2 singleton without local state', async () => {
    await expect(Promise.resolve(storeSettingsRepository.get())).resolves.toEqual({
      id: true,
      storeName: 'KISOK',
      globalLowStockThreshold: 5,
      customerSuccessResetSeconds: 60,
      storeTimezone: 'UTC',
      logoMediaAssetId: null,
    });
    await expect(
      Promise.resolve(
        storeSettingsRepository.update({
          storeName: 'KISOK Updated',
          globalLowStockThreshold: 8,
          customerSuccessResetSeconds: 90,
          storeTimezone: 'UTC',
        }),
      ),
    ).resolves.toMatchObject({ storeName: 'KISOK Updated', globalLowStockThreshold: 8 });
    expect(testContext.calls).toContainEqual({
      operation: 'update',
      payload: {
        store_name: 'KISOK Updated',
        global_low_stock_threshold: 8,
        customer_success_reset_seconds: 90,
        store_timezone: 'UTC',
      },
    });
  });
});
