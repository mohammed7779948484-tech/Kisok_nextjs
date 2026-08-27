import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

import { resolveLowStockThreshold } from '@/features/dashboard-operations/lib/dashboard-model';

import type { Database } from '../database.types';

const ORDER_METHOD = 'order' as const;
const LOW_STOCK_PAGE_SIZE = 1000;

type LowStockCandidateRow = {
  id: string;
  low_stock_threshold: number | null;
  inventory: { current_quantity: number } | null;
  products: { is_active: boolean } | null;
};

/**
 * PostgREST can't compare `inventory.current_quantity` against a per-row
 * threshold-with-fallback (variant override, else store-wide default) in a
 * single `count: exact` filter — that comparison needs two dynamic columns,
 * not a literal. So instead of capping at a fixed row count (which silently
 * undercounts once the catalog grows past it), page through every active
 * variant in bounded batches until a page comes back short, keeping the
 * low-stock count exact no matter how large the table gets.
 */
async function fetchActiveLowStockCandidates(
  supabase: SupabaseClient<Database>,
): Promise<{ rows: LowStockCandidateRow[]; error: PostgrestError | null }> {
  const rows: LowStockCandidateRow[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('product_variants')
      .select('id,low_stock_threshold,inventory!inner(current_quantity),products!inner(is_active)')
      .eq('is_active', true)
      .eq('products.is_active', true)
      .range(from, from + LOW_STOCK_PAGE_SIZE - 1);

    if (error) {
      return { rows, error };
    }

    const page = (data ?? []) as unknown as LowStockCandidateRow[];
    rows.push(...page);

    if (page.length < LOW_STOCK_PAGE_SIZE) {
      break;
    }
    from += LOW_STOCK_PAGE_SIZE;
  }

  return { rows, error: null };
}

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

  const [
    activeProductCount,
    activeVariantCount,
    unavailableVariantCount,
    orders,
    openOrders,
    adjustments,
    brands,
    categories,
    media,
    settings,
    lowStockCandidates,
  ] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('product_variants')
      .select('id,products!inner(is_active)', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('products.is_active', true),
    supabase
      .from('product_variants')
      .select('id,inventory!inner(current_quantity),products!inner(is_active)', {
        count: 'exact',
        head: true,
      })
      .eq('is_active', true)
      .eq('products.is_active', true)
      .lte('inventory.current_quantity', 0),
    supabase
      .from('orders')
      .select('id,display_number,status,created_at')
      [ORDER_METHOD]('created_at', { ascending: false })
      .limit(5),
    // Independent exact count over ALL open orders — never derived from the
    // 5-row `recentOrders` slice above, which would silently undercount
    // whenever more than 5 open orders exist.
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .not('status', 'in', '(cancelled,completed)'),
    supabase.from('inventory_adjustments').select('id', { count: 'exact', head: true }),
    supabase.from('brands').select('id', { count: 'exact', head: true }),
    supabase.from('categories').select('id', { count: 'exact', head: true }),
    supabase.from('media_assets').select('id', { count: 'exact', head: true }),
    supabase
      .from('store_settings')
      .select('global_low_stock_threshold')
      .eq('id', true)
      .maybeSingle(),
    fetchActiveLowStockCandidates(supabase),
  ]);

  const firstError = [
    activeProductCount,
    activeVariantCount,
    unavailableVariantCount,
    orders,
    openOrders,
    adjustments,
    brands,
    categories,
    media,
    settings,
    lowStockCandidates,
  ].find((result) => result.error)?.error;

  if (firstError) {
    return { status: 'error', message: 'Operational data could not be loaded.', snapshot: null };
  }

  const globalThreshold = settings.data?.global_low_stock_threshold ?? 0;
  const orderRows = orders.data ?? [];
  const lowStockCount = lowStockCandidates.rows.filter((row) => {
    const quantity = row.inventory?.current_quantity;
    return (
      quantity !== undefined &&
      quantity !== null &&
      quantity <= resolveLowStockThreshold(row.low_stock_threshold, globalThreshold)
    );
  }).length;

  return {
    status: 'ready',
    snapshot: {
      activeProductCount: activeProductCount.count ?? 0,
      brandCount: brands.count ?? 0,
      categoryCount: categories.count ?? 0,
      inventoryAdjustmentCount: adjustments.count ?? 0,
      lowStockCount,
      mediaAssetCount: media.count ?? 0,
      openOrderCount: openOrders.count ?? 0,
      recentOrders: orderRows.map((order) => ({
        displayNumber: order.display_number,
        id: order.id,
        status: order.status,
      })),
      unavailableVariantCount: unavailableVariantCount.count ?? 0,
      variantCount: activeVariantCount.count ?? 0,
    },
  };
}
