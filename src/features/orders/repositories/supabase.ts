import type { SupabaseClient } from '@supabase/supabase-js';

import { getBrowserSupabaseClient } from '@/infrastructure/supabase/client/browser-client';
import type { Database } from '@/infrastructure/supabase/database.types';

import type { OrderItemRecord, OrderRecord, OrderStatus, OrdersDataContract } from '../types';

const ORDER_METHOD = 'order' as const;

// The Admin Orders UI is an operational fulfillment queue, not a full-table
// browser — bound every fetch to a page of recent orders instead of pulling
// the entire `orders` table (with nested order_items) on every load.
export const ORDERS_PAGE_SIZE = 100;
const FINAL_ORDER_STATUSES = '(completed,cancelled)';

export interface ListOrdersOptions {
  /** Include completed/cancelled orders instead of just the open queue. */
  includeCompleted?: boolean;
  /** Cursor for "load older orders": only orders created before this ISO timestamp. */
  before?: string;
}

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
  if (!value || typeof value !== 'object') return '';

  // Lean V2 `create_order` stores an ordered JSON array of `{ type, value }`
  // snapshots. Retain object support only for historical rows created before
  // that contract, never for new fixtures or writes.
  if (Array.isArray(value)) {
    return value
      .filter((option): option is { type: string; value: string } =>
        Boolean(
          option &&
            typeof option === 'object' &&
            'type' in option &&
            'value' in option &&
            typeof option.type === 'string' &&
            typeof option.value === 'string',
        ),
      )
      .map((option) => `${option.type}: ${option.value}`)
      .join(' · ');
  }

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

export function createOrdersRepository(client: SupabaseClient<Database>) {
  return {
    async updateStatus(orderId: string, targetStatus: OrderStatus, reason?: string) {
      const result = await client.rpc('update_order_status', {
        order_id: orderId,
        target_status: targetStatus,
        ...(reason ? { reason } : {}),
      });
      if (result.error) throw result.error;
      return result.data;
    },

    async listOrders(options: ListOrdersOptions = {}): Promise<OrderRecord[]> {
      let query = client
        .from('orders')
        .select(
          'id,display_number,status,created_at,order_items(id,product_name,variant_name,variant_sku,variant_options,brand_name,image_secure_url,quantity)',
        )
        [ORDER_METHOD]('created_at', { ascending: false })
        .limit(ORDERS_PAGE_SIZE);

      if (!options.includeCompleted) {
        query = query.not('status', 'in', FINAL_ORDER_STATUSES);
      }
      if (options.before) {
        query = query.lt('created_at', options.before);
      }

      const result = await query;
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
  } satisfies OrdersDataContract;
}

export const ordersRepository = {
  listOrders(options?: ListOrdersOptions) {
    return createOrdersRepository(getClientOrThrow()).listOrders(options);
  },
  updateStatus(orderId: string, targetStatus: OrderStatus, reason?: string) {
    return createOrdersRepository(getClientOrThrow()).updateStatus(orderId, targetStatus, reason);
  },
} satisfies OrdersDataContract;
