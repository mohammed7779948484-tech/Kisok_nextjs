/**
 * Single source of truth for "effective" low-stock threshold resolution:
 * a Variant's own threshold overrides the store-wide default. Every surface
 * that judges stock health (Dashboard, Inventory, Product Catalog) must use
 * this instead of inventing its own cutoff.
 */
export function resolveLowStockThreshold(
  variantThreshold: number | null,
  globalThreshold: number,
): number {
  return variantThreshold ?? globalThreshold;
}
