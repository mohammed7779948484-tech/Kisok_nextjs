import type { SupabaseClient } from '@supabase/supabase-js';

import { getBrowserSupabaseClient } from '@/infrastructure/supabase/client/browser-client';
import type { Database } from '@/infrastructure/supabase/database.types';

import type { OrderRecord, OrdersDataContract } from '../types';

type OrderListRow = {
  id: string;
  display_number: string;
  status: Database['public']['Enums']['order_status'];
  created_at: string;
  order_items: Array<{ id: string }>;
};

function getClientOrThrow(): SupabaseClient<Database> {
  const client = getBrowserSupabaseClient();
  if (!client) throw new Error('Supabase is not configured for Orders.');
  return client;
}

export function createOrdersRepository(client: SupabaseClient<Database>): OrdersDataContract {
  return {
    async updateStatus(orderId, targetStatus, reason) {
      const result = await client.rpc('update_order_status', {
        order_id: orderId,
        target_status: targetStatus,
        ...(reason ? { reason } : {}),
      });
      if (result.error) throw result.error;
      return result.data;
    },

    async listOrders(): Promise<OrderRecord[]> {
      const result = await client
        .from('orders')
        .select('id,display_number,status,created_at,order_items(id)')
        .order('created_at', { ascending: false });
      if (result.error) throw result.error;
      return ((result.data ?? []) as unknown as OrderListRow[]).map((order) => ({
        id: order.id,
        displayNumber: order.display_number,
        status: order.status,
        createdAt: order.created_at,
        itemCount: order.order_items.length,
      }));
    },
  };
}

export const ordersRepository: OrdersDataContract = {
  listOrders() {
    return createOrdersRepository(getClientOrThrow()).listOrders();
  },
  updateStatus(orderId, targetStatus, reason) {
    return createOrdersRepository(getClientOrThrow()).updateStatus(orderId, targetStatus, reason);
  },
};
