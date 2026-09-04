import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

const testContext = vi.hoisted(() => ({
  client: {
    rpc: async (name: string, args: unknown) => ({
      data: { name, args },
      error: null,
    }),
  } as unknown as SupabaseClient<Database>,
}));

vi.mock('@/infrastructure/supabase/client/browser-client', () => ({
  getBrowserSupabaseClient: () => testContext.client,
}));

import { ordersRepository } from './index';

describe('Order status transition repository', () => {
  it('calls Lean V2 update_order_status with target status and reason', async () => {
    await expect(
      ordersRepository.updateStatus('order-1', 'cancelled', 'Customer request'),
    ).resolves.toEqual({
      name: 'update_order_status',
      args: { order_id: 'order-1', target_status: 'cancelled', reason: 'Customer request' },
    });
  });
});
