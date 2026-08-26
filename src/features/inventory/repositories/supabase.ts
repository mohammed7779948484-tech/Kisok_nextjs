import type { SupabaseClient } from '@supabase/supabase-js';

import { getBrowserSupabaseClient } from '@/infrastructure/supabase/client/browser-client';
import type { Database } from '@/infrastructure/supabase/database.types';
import {
  applyInventoryAdjustment,
  type InventoryAdjustmentInput,
  type InventoryAdjustmentResult,
  type SetInventoryQuantityInput,
  setInventoryQuantity,
} from '@/infrastructure/supabase/inventory/adapter';

import type { InventoryDataContract, InventoryRecord } from '../types';

type InventoryJoinedRow = {
  variant_id: string;
  current_quantity: number;
  product_variants: {
    id: string;
    sku: string;
    barcode: string | null;
    low_stock_threshold: number | null;
    products: {
      id: string;
      name: string;
    };
  };
};

function getClientOrThrow(): SupabaseClient<Database> {
  const client = getBrowserSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured for Inventory.');
  }
  return client;
}

export function createInventoryRepository(client: SupabaseClient<Database>): InventoryDataContract {
  return {
    async list(): Promise<InventoryRecord[]> {
      const settingsResult = await client
        .from('store_settings')
        .select('global_low_stock_threshold')
        .single();
      if (settingsResult.error) throw settingsResult.error;

      const inventoryResult = await client
        .from('inventory')
        .select(
          'variant_id,current_quantity,product_variants!inner(id,sku,barcode,low_stock_threshold,products!inner(id,name))',
        )
        ['order']('current_quantity', { ascending: true });
      if (inventoryResult.error) throw inventoryResult.error;

      const globalThreshold = settingsResult.data.global_low_stock_threshold;
      return ((inventoryResult.data ?? []) as unknown as InventoryJoinedRow[]).map((row) => {
        const variant = row.product_variants;
        const lowStockThreshold = variant.low_stock_threshold ?? globalThreshold;
        return {
          variantId: row.variant_id,
          productId: variant.products.id,
          productName: variant.products.name,
          sku: variant.sku,
          barcode: variant.barcode,
          currentQuantity: row.current_quantity,
          lowStockThreshold,
          isLowStock: row.current_quantity <= lowStockThreshold,
        };
      });
    },

    async applyAdjustment(input: InventoryAdjustmentInput): Promise<InventoryAdjustmentResult> {
      return applyInventoryAdjustment(getClientOrThrow(), input);
    },

    async setQuantity(input: SetInventoryQuantityInput): Promise<InventoryAdjustmentResult> {
      return setInventoryQuantity(getClientOrThrow(), input);
    },
  };
}

export const inventoryRepository: InventoryDataContract = {
  async list() {
    return createInventoryRepository(getClientOrThrow()).list();
  },
  async applyAdjustment(input) {
    return createInventoryRepository(getClientOrThrow()).applyAdjustment(input);
  },
  async setQuantity(input) {
    return createInventoryRepository(getClientOrThrow()).setQuantity(input);
  },
};
