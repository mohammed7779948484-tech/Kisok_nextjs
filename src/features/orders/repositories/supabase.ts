import type { SupabaseClient } from '@supabase/supabase-js';

import { getBrowserSupabaseClient } from '@/infrastructure/supabase/client/browser-client';
import type { Database } from '@/infrastructure/supabase/database.types';

import type { OrderItemRecord, OrderRecord, OrdersDataContract } from '../types';

type OrderItemListRow = {
  id: string;
  product_name: string;
  variant_name: string | null;
  variant_sku: string;
  variant_options: Database['public']['Tables']['order_items']['Row']['variant_options'];
  brand_name: string | null;
  image_secure_url: string | null;
  quantity: number;
};

type OrderListRow = {
  id: string;
  display_number: string;
  status: Database['public']['Enums']['order_status'];
  created_at: string;
  order_items: OrderItemListRow[];
};

function getClientOrThrow(): SupabaseClient<Database> {
  const client = getBrowserSupabaseClient();
  if (!client) throw new Error('Supabase is not configured for Orders.');
  return client;
}

function formatVariantOptions(value: OrderItemListRow['variant_options']): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';

  return Object.entries(value)
    .map(([key, option]) => `${key}: ${String(option)}`)
    .join(' · ');
}

function mapOrderItem(item: OrderItemListRow): OrderItemRecord {
  return {
    id: item.id,
    productName: item.product_name,
    variantName: item.variant_name,
    variantSku: item.variant_sku,
    variantOptions: formatVariantOptions(item.variant_options),
    brandName: item.brand_name,
    imageSecureUrl: item.image_secure_url,
    quantity: item.quantity,
  };
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
        .select(
          'id,display_number,status,created_at,order_items(id,product_name,variant_name,variant_sku,variant_options,brand_name,image_secure_url,quantity)',
        )
        ['order']('created_at', { ascending: false });
      if (result.error) throw result.error;
      return ((result.data ?? []) as unknown as OrderListRow[]).map((order) => ({
        id: order.id,
        displayNumber: order.display_number,
        status: order.status,
        createdAt: order.created_at,
        itemCount: order.order_items.length,
        items: order.order_items.map(mapOrderItem),
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
