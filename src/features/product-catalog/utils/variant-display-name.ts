import type { VariantOptionValueRecord } from '../types';

/**
 * Lean V2 persists the SKU as an operational identifier. Customer-facing
 * names are an intentional exception: an explicit title override wins, then
 * selected Option Values in stable Option Type order, then the SKU fallback.
 */
export function deriveVariantDisplayName(
  titleOverride: string | null,
  selections: VariantOptionValueRecord[],
  sku = 'Unnamed Variant',
): string {
  const override = titleOverride?.trim();
  if (override) return override;

  const derived = [...selections]
    .sort(
      (left, right) =>
        left.optionTypeName.localeCompare(right.optionTypeName) ||
        left.optionTypeId.localeCompare(right.optionTypeId),
    )
    .map((selection) => `${selection.optionTypeName}: ${selection.optionValueName}`)
    .join(' · ');

  return derived || sku;
}
