import { describe, expect, it } from 'vitest';

import { getProductVisibility, getVariantEligibility } from './product-visibility';

describe('getProductVisibility', () => {
  it('blocks customer visibility when an active Product depends on an inactive Brand or Option Value', () => {
    const visibility = getProductVisibility({
      brand: { id: 'brand-1', isActive: false, name: 'Northline' },
      isActive: true,
      variants: [
        {
          id: 'variant-1',
          isActive: true,
          optionValues: [
            {
              optionTypeIsActive: true,
              optionTypeName: 'Flavor',
              optionValueIsActive: false,
              optionValueName: 'Berry',
            },
          ],
          sku: 'KSK-000001',
        },
      ],
    });

    expect(visibility.isCustomerVisible).toBe(false);
    expect(visibility.reasons).toEqual([
      'Assigned Brand is inactive.',
      'Variant KSK-000001 uses inactive Option Value “Berry”.',
    ]);
  });

  it('reports inactive Variant eligibility with an actionable draft reason', () => {
    expect(
      getVariantEligibility({
        isActive: false,
        optionValues: [],
        sku: 'KSK-000001',
      }),
    ).toEqual({ isCustomerEligible: false, reasons: ['Variant is a draft.'] });
  });

  it('blocks activation while Variant dependency data is still loading', () => {
    const visibility = getProductVisibility({
      brand: null,
      dependencyDataReady: false,
      isActive: true,
      variants: [],
    });

    expect(visibility).toEqual({
      isCustomerVisible: false,
      reasons: ['Variant eligibility is still loading. Retry when Product setup is ready.'],
    });
  });
});
