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
});
