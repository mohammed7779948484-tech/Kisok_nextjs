import type { SupabaseClient } from '@supabase/supabase-js';

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
  supabase: SupabaseClient | null,
): Promise<DashboardSnapshotResult> {
  if (!supabase) {
    return { status: 'unconfigured', snapshot: null };
  }

  const [products, variants, inventory, orders, adjustments, brands, categories, media] =
    await Promise.all([
      supabase.from('products').select('id,is_active'),
      supabase.from('product_variants').select('id,is_active'),
      supabase.from('inventory').select('variant_id,current_quantity'),
      supabase.from('orders').select('id,display_number,status,created_at').limit(5),
      supabase.from('inventory_adjustments').select('id').limit(5),
      supabase.from('brands').select('id', { count: 'exact', head: true }),
      supabase.from('categories').select('id', { count: 'exact', head: true }),
      supabase.from('media_assets').select('id', { count: 'exact', head: true }),
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
  ].find((result) => result.error)?.error;

  if (firstError) {
    return { status: 'error', message: 'Operational data could not be loaded.', snapshot: null };
  }

  const productRows = products.data ?? [];
  const variantRows = variants.data ?? [];
  const inventoryRows = inventory.data ?? [];
  const orderRows = [...(orders.data ?? [])].sort((left, right) =>
    right.created_at.localeCompare(left.created_at),
  );

  return {
    status: 'ready',
    snapshot: {
      activeProductCount: productRows.filter((product) => product.is_active).length,
      brandCount: brands.count ?? 0,
      categoryCount: categories.count ?? 0,
      inventoryAdjustmentCount: adjustments.data?.length ?? 0,
      lowStockCount: inventoryRows.filter((item) => item.current_quantity <= 5).length,
      mediaAssetCount: media.count ?? 0,
      openOrderCount: orderRows.filter(
        (order) => !['cancelled', 'completed'].includes(order.status),
      ).length,
      recentOrders: orderRows.map((order) => ({
        displayNumber: order.display_number,
        id: order.id,
        status: order.status,
      })),
      unavailableVariantCount: inventoryRows.filter((item) => item.current_quantity <= 0).length,
      variantCount: variantRows.length,
    },
  };
}
