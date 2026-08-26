import type { SupabaseClient } from '@supabase/supabase-js';

import { resolveLowStockThreshold } from '@/features/dashboard-operations/lib/dashboard-model';

import type { Database } from '../database.types';

const ORDER_METHOD = 'order' as const;

export type DashboardOperationalSnapshot = {
  activeProductCount: number;
  brandCount: number;
  categoryCount: number;
  inventoryAdjustmentCount: number;
  lowStockCount: number;
  mediaAssetCount: number;
  openOrderCount: number;
  recentOrders: Array<{ displayNumber: string; id: string; status: string }>;
  unavailableVariantCount: number;
  variantCount: number;
};

export type DashboardSnapshotResult =
  | { status: 'unconfigured'; snapshot: null }
  | { status: 'error'; message: string; snapshot: null }
  | { status: 'ready'; snapshot: DashboardOperationalSnapshot };

export async function getDashboardOperationalSnapshot(
  supabase: SupabaseClient<Database> | null,
): Promise<DashboardSnapshotResult> {
  if (!supabase) {
    return { status: 'unconfigured', snapshot: null };
  }

  const [products, variants, inventory, orders, adjustments, brands, categories, media, settings] =
    await Promise.all([
      supabase.from('products').select('id,is_active').limit(1000),
      supabase
        .from('product_variants')
        .select('id,product_id,is_active,low_stock_threshold')
        .limit(1000),
      supabase.from('inventory').select('variant_id,current_quantity').limit(1000),
      supabase
        .from('orders')
        .select('id,display_number,status,created_at')
        [ORDER_METHOD]('created_at', { ascending: false })
        .limit(5),
      supabase.from('inventory_adjustments').select('id', { count: 'exact', head: true }),
      supabase.from('brands').select('id', { count: 'exact', head: true }),
      supabase.from('categories').select('id', { count: 'exact', head: true }),
      supabase.from('media_assets').select('id', { count: 'exact', head: true }),
      supabase
        .from('store_settings')
        .select('global_low_stock_threshold')
        .eq('id', true)
        .maybeSingle(),
    ]);

  const firstError = [
    products,
    variants,
    inventory,
    orders,
    adjustments,
    brands,
    categories,
    media,
    settings,
  ].find((result) => result.error)?.error;

  if (firstError) {
    return { status: 'error', message: 'Operational data could not be loaded.', snapshot: null };
  }

  const productRows = products.data ?? [];
  const activeProductIds = new Set(
    productRows.filter((product) => product.is_active).map((product) => product.id),
  );
  const activeVariantRows = (variants.data ?? []).filter(
    (variant) => variant.is_active && activeProductIds.has(variant.product_id),
  );
  const inventoryByVariant = new Map(
    (inventory.data ?? []).map((item) => [item.variant_id, item.current_quantity]),
  );
  const globalThreshold = settings.data?.global_low_stock_threshold ?? 0;
  const orderRows = orders.data ?? [];

  return {
    status: 'ready',
    snapshot: {
      activeProductCount: activeProductIds.size,
      brandCount: brands.count ?? 0,
      categoryCount: categories.count ?? 0,
      inventoryAdjustmentCount: adjustments.count ?? 0,
      lowStockCount: activeVariantRows.filter((variant) => {
        const quantity = inventoryByVariant.get(variant.id);
        return (
          quantity !== undefined &&
          quantity <= resolveLowStockThreshold(variant.low_stock_threshold, globalThreshold)
        );
      }).length,
      mediaAssetCount: media.count ?? 0,
      openOrderCount: orderRows.filter(
        (order) => !['cancelled', 'completed'].includes(order.status),
      ).length,
      recentOrders: orderRows.map((order) => ({
        displayNumber: order.display_number,
        id: order.id,
        status: order.status,
      })),
      unavailableVariantCount: activeVariantRows.filter(
        (variant) => (inventoryByVariant.get(variant.id) ?? 0) <= 0,
      ).length,
      variantCount: activeVariantRows.length,
    },
  };
}
