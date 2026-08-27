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
  const reasons: string[] = [];

  if (!isActive) reasons.push('Product is a draft.');
  if (brand && !brand.isActive) reasons.push('Assigned Brand is inactive.');

  const activeVariants = variants.filter((variant) => variant.isActive);
  if (isActive && activeVariants.length === 0) {
    reasons.push(
      variants.length === 0 ? 'No Variant exists yet.' : 'No active Variant is available.',
    );
  }

  for (const variant of activeVariants) {
    for (const reason of getVariantEligibility(variant).reasons) {
      reasons.push(`Variant ${variant.sku} ${reason.charAt(0).toLowerCase()}${reason.slice(1)}`);
    }
  }

  return { isCustomerVisible: reasons.length === 0, reasons };
}
