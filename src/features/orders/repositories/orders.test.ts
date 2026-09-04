import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => {
  const calls: {
    limit?: number;
    not?: [string, string, string];
    lt?: [string, string];
  } = {};

  const orderRow = {
    id: 'order-1',
    display_number: 'KSK-001',
    status: 'new',
    created_at: '2026-08-26T10:00:00Z',
    order_items: [
      {
        id: 'item-1',
        product_name: 'Cedar Mug',
        variant_name: 'Large',
        variant_sku: 'KSK-000001',
        variant_options: [
          { type: 'Flavor', value: 'Berry' },
          { type: 'Size', value: 'Large' },
        ],
        brand_name: 'Kisok Studio',
        image_secure_url: 'https://res.cloudinary.com/demo/image/upload/mug.jpg',
        quantity: 2,
      },
      {
        id: 'item-2',
        product_name: 'Canvas Tote',
        variant_name: null,
        variant_sku: 'KSK-000002',
        variant_options: null,
        brand_name: null,
        image_secure_url: null,
        quantity: 1,
      },
    ],
  };

  function makeBuilder() {
    // A real Promise (via Object.assign) rather than a plain object defining
    // its own `then` — the resolved value here never depends on the chained
    // filters, so it can be constructed eagerly.
    const builder = Object.assign(Promise.resolve({ data: [orderRow], error: null }), {
      order(_column: string, _options: { ascending: boolean }) {
        return builder;
      },
      limit(count: number) {
        calls.limit = count;
        return builder;
      },
      not(column: string, operator: string, value: string) {
        calls.not = [column, operator, value];
        return builder;
      },
      lt(column: string, value: string) {
        calls.lt = [column, value];
        return builder;
      },
    });
    return builder;
  }

  const client = {
    from(table: string) {
      if (table !== 'orders') throw new Error(`unexpected table ${table}`);
      return {
        select(_columns: string) {
          return makeBuilder();
        },
      };
    },
  } as unknown as SupabaseClient<Database>;

  return { client, calls };
});

vi.mock('@/infrastructure/supabase/client/browser-client', () => ({
  getBrowserSupabaseClient: () => testContext.client,
}));

import { ordersRepository } from './index';

describe('Orders Supabase repository', () => {
  beforeEach(() => {
    delete testContext.calls.limit;
    delete testContext.calls.not;
    delete testContext.calls.lt;
  });

  it('lists hosted operational orders with item counts and no financial fields', async () => {
    await expect(ordersRepository.listOrders()).resolves.toEqual([
      {
        id: 'order-1',
        displayNumber: 'KSK-001',
        status: 'new',
        createdAt: '2026-08-26T10:00:00Z',
        itemCount: 2,
        items: [
          {
            id: 'item-1',
            productName: 'Cedar Mug',
            variantName: 'Large',
            variantSku: 'KSK-000001',
            variantOptions: 'Flavor: Berry · Size: Large',
            brandName: 'Kisok Studio',
            imageSecureUrl: 'https://res.cloudinary.com/demo/image/upload/mug.jpg',
            quantity: 2,
          },
          {
            id: 'item-2',
            productName: 'Canvas Tote',
            variantName: null,
            variantSku: 'KSK-000002',
            variantOptions: '',
            brandName: null,
            imageSecureUrl: null,
            quantity: 1,
          },
        ],
      },
    ]);
  });

  it('excludes completed and cancelled orders by default and bounds the page size', async () => {
    await ordersRepository.listOrders();

    expect(testContext.calls.not).toEqual(['status', 'in', '(completed,cancelled)']);
    expect(testContext.calls.limit).toBe(100);
  });

  it('includes completed and cancelled orders when explicitly requested', async () => {
    await ordersRepository.listOrders({ includeCompleted: true });

    expect(testContext.calls.not).toBeUndefined();
    expect(testContext.calls.limit).toBe(100);
  });

  it('loads an older page of orders using a before cursor', async () => {
    await ordersRepository.listOrders({ before: '2026-08-01T00:00:00Z' });

    expect(testContext.calls.lt).toEqual(['created_at', '2026-08-01T00:00:00Z']);
  });
});
