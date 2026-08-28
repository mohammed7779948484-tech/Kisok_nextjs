import type { SupabaseClient } from '@supabase/supabase-js';

import { deriveVariantDisplayName } from '@/features/product-catalog/utils/variant-display-name';
import { getBrowserSupabaseClient } from '@/infrastructure/supabase/client/browser-client';
import type { Database } from '@/infrastructure/supabase/database.types';
import {
  applyInventoryAdjustment,
  type InventoryAdjustmentInput,
  type InventoryAdjustmentResult,
  type SetInventoryQuantityInput,
  setInventoryQuantity,
} from '@/infrastructure/supabase/inventory/adapter';
import { resolveLowStockThreshold } from '@/lib/utils/inventory/low-stock-threshold';

import type { InventoryDataContract, InventoryHistoryRecord, InventoryRecord } from '../types';

const ORDER_METHOD = 'order' as const;

type RawOptionRelation = {
  option_types: { id: string; name: string } | null;
  option_values: { id: string; value: string } | null;
};

type InventoryJoinedRow = {
  variant_id: string;
  current_quantity: number;
  product_variants: {
    id: string;
    sku: string;
    barcode: string | null;
    title_override: string | null;
    low_stock_threshold: number | null;
    products: {
      id: string;
      name: string;
    };
    variant_option_values?: RawOptionRelation[];
  };
};

type InventoryHistoryJoinedRow = {
  id: string;
  variant_id: string;
  adjustment_type: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reason: string | null;
  created_at: string;
  product_variants: {
    sku: string;
    title_override: string | null;
    products: {
      name: string;
    };
    variant_option_values?: RawOptionRelation[];
  };
};

function getClientOrThrow(): SupabaseClient<Database> {
  const client = getBrowserSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured for Inventory.');
  }
  return client;
}

function mapSelections(vovs?: RawOptionRelation[]) {
  return (vovs ?? [])
    .filter((vov) => vov.option_types && vov.option_values)
    .map((vov) => ({
      optionTypeId: vov.option_types?.id ?? '',
      optionTypeName: vov.option_types?.name ?? '',
      optionValueId: vov.option_values?.id ?? '',
      optionValueName: vov.option_values?.value ?? '',
    }));
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
          'variant_id,current_quantity,product_variants!inner(id,sku,barcode,title_override,low_stock_threshold,products!inner(id,name),variant_option_values(option_types(id,name),option_values(id,value)))',
        )
        [ORDER_METHOD]('current_quantity', { ascending: true });
      if (inventoryResult.error) throw inventoryResult.error;

      const globalThreshold = settingsResult.data.global_low_stock_threshold;
      return ((inventoryResult.data ?? []) as unknown as InventoryJoinedRow[]).map((row) => {
        const variant = row.product_variants;
        const lowStockThreshold = resolveLowStockThreshold(
          variant.low_stock_threshold,
          globalThreshold,
        );
        const selections = mapSelections(variant.variant_option_values);
        const variantName = deriveVariantDisplayName(
          variant.title_override,
          selections,
          variant.sku,
        );

        return {
          variantId: row.variant_id,
          productId: variant.products.id,
          productName: variant.products.name,
          variantName,
          sku: variant.sku,
          barcode: variant.barcode,
          currentQuantity: row.current_quantity,
          lowStockThreshold,
          isLowStock: row.current_quantity <= lowStockThreshold,
        };
      });
    },

    async listHistory(search = ''): Promise<InventoryHistoryRecord[]> {
      let query = client
        .from('inventory_adjustments')
        .select(
          'id,variant_id,adjustment_type,quantity_change,quantity_before,quantity_after,reason,created_at,product_variants!inner(sku,title_override,products!inner(name),variant_option_values(option_types(id,name),option_values(id,value)))',
        );

      const normalizedSearch = search.trim();
      if (normalizedSearch) {
        query = query.ilike('reason', `%${normalizedSearch}%`);
      }

      const result = await query[ORDER_METHOD]('created_at', { ascending: false });
      if (result.error) throw result.error;

      return ((result.data ?? []) as unknown as InventoryHistoryJoinedRow[]).map((row) => {
        const variant = row.product_variants;
        const selections = mapSelections(variant.variant_option_values);
        const variantName = deriveVariantDisplayName(
          variant.title_override,
          selections,
          variant.sku,
        );

        return {
          id: row.id,
          variantId: row.variant_id,
          productName: variant.products.name,
          variantName,
          sku: variant.sku,
          type: row.adjustment_type,
          delta: row.quantity_change,
          quantityBefore: row.quantity_before,
          quantityAfter: row.quantity_after,
          reason: row.reason,
          createdAt: row.created_at,
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
  async listHistory(search) {
    return createInventoryRepository(getClientOrThrow()).listHistory(search);
  },
  async applyAdjustment(input) {
    return createInventoryRepository(getClientOrThrow()).applyAdjustment(input);
  },
  async setQuantity(input) {
    return createInventoryRepository(getClientOrThrow()).setQuantity(input);
  },
};
