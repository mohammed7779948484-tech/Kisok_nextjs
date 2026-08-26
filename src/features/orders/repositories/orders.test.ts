import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const client = {
    from(table: string) {
      if (table !== 'orders') throw new Error(`unexpected table ${table}`);
      return {
        select(_columns: string) {
          return {
            order(_column: string, _options: { ascending: boolean }) {
              return Promise.resolve({
                data: [
                  {
                    id: 'order-1',
                    display_number: 'KSK-001',
                    status: 'new',
                    created_at: '2026-08-26T10:00:00Z',
                    order_items: [{ id: 'item-1' }, { id: 'item-2' }],
                  },
                ],
                error: null,
              });
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

import { ordersRepository } from './index';

describe('Orders Supabase repository', () => {
  it('lists hosted operational orders with item counts and no financial fields', async () => {
    await expect(ordersRepository.listOrders()).resolves.toEqual([
      {
        id: 'order-1',
        displayNumber: 'KSK-001',
        status: 'new',
        createdAt: '2026-08-26T10:00:00Z',
        itemCount: 2,
      },
    ]);
  });
});
