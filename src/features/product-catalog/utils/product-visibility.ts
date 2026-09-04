export type ProductVisibilityOption = {
  optionTypeIsActive: boolean;
  optionTypeName: string;
  optionValueIsActive: boolean;
  optionValueName: string;
};

export type ProductVisibilityVariant = {
  id: string;
  isActive: boolean;
  optionValues: ProductVisibilityOption[];
  sku: string;
};

export type ProductVisibilityInput = {
  brand: { id: string; isActive: boolean; name: string } | null;
  dependencyDataReady?: boolean;
  isActive: boolean;
  variants: ProductVisibilityVariant[];
};

export type ProductVisibility = {
  isCustomerVisible: boolean;
  reasons: string[];
};

export type VariantEligibility = {
  isCustomerEligible: boolean;
  reasons: string[];
};

type VariantEligibilityInput = Omit<ProductVisibilityVariant, 'id'>;

export function getVariantEligibility(variant: VariantEligibilityInput): VariantEligibility {
  const reasons: string[] = [];
  if (!variant.isActive) reasons.push('Variant is a draft.');
  for (const option of variant.optionValues) {
    if (!option.optionTypeIsActive) {
      reasons.push(`Uses inactive Option Type “${option.optionTypeName}”.`);
    }
    if (!option.optionValueIsActive) {
      reasons.push(`Uses inactive Option Value “${option.optionValueName}”.`);
    }
  }
  return { isCustomerEligible: reasons.length === 0, reasons };
}

/**
 * Mirrors the Lean V2 `get_customer_catalog()` rule: a Product is
 * customer-visible when it (and its Brand, if any) is active AND it has at
 * least one active Variant that is individually eligible. An ineligible
 * sibling Variant only removes itself from the catalog — it must never hide
 * a Product that still has another, valid Variant. Variant-specific
 * problems remain reachable via `getVariantEligibility` for the Variant's
 * own diagnostic; they are folded into `reasons` here only when they are
 * part of why the whole Product is hidden.
 */
export function getProductVisibility({
  brand,
  dependencyDataReady = true,
  isActive,
  variants,
}: ProductVisibilityInput): ProductVisibility {
  if (!dependencyDataReady) {
    return {
      isCustomerVisible: false,
      reasons: ['Variant eligibility is still loading. Retry when Product setup is ready.'],
    };
  }

  const blockingReasons: string[] = [];
  if (!isActive) blockingReasons.push('Product is a draft.');
  if (brand && !brand.isActive) blockingReasons.push('Assigned Brand is inactive.');

  const activeVariants = variants.filter((variant) => variant.isActive);
  const variantEligibilities = activeVariants.map((variant) => ({
    eligibility: getVariantEligibility(variant),
    variant,
  }));
  const hasEligibleVariant = variantEligibilities.some(
    ({ eligibility }) => eligibility.isCustomerEligible,
  );

  const isCustomerVisible = blockingReasons.length === 0 && hasEligibleVariant;
  if (isCustomerVisible) return { isCustomerVisible: true, reasons: [] };

  const reasons = [...blockingReasons];
  if (blockingReasons.length === 0) {
    reasons.push(
      variants.length === 0
        ? 'No Variant exists yet.'
        : activeVariants.length === 0
          ? 'No active Variant is available.'
          : 'No active Variant is currently eligible for customers.',
    );
  }
  for (const { eligibility, variant } of variantEligibilities) {
    for (const reason of eligibility.reasons) {
      reasons.push(`Variant ${variant.sku} ${reason.charAt(0).toLowerCase()}${reason.slice(1)}`);
    }
  }

  return { isCustomerVisible: false, reasons };
}
