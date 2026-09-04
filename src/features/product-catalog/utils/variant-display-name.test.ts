import { describe, expect, it } from 'vitest';

import { deriveVariantDisplayName } from './variant-display-name';

describe('deriveVariantDisplayName', () => {
  it('uses the advanced title override only when deliberately present', () => {
    expect(
      deriveVariantDisplayName('Limited release', [
        {
          optionTypeId: 'flavor',
          optionTypeName: 'Flavor',
          optionValueId: 'berry',
          optionValueName: 'Berry',
        },
      ]),
    ).toBe('Limited release');
  });

  it('derives a deterministic name from sorted Option Type labels when no override exists', () => {
    expect(
      deriveVariantDisplayName(null, [
        {
          optionTypeId: 'size',
          optionTypeName: 'Size',
          optionValueId: 'large',
          optionValueName: 'Large',
        },
        {
          optionTypeId: 'flavor',
          optionTypeName: 'Flavor',
          optionValueId: 'berry',
          optionValueName: 'Berry',
        },
      ]),
    ).toBe('Flavor: Berry · Size: Large');
  });

  it('falls back to the generated SKU when neither an override nor Options are available', () => {
    expect(deriveVariantDisplayName(null, [], 'KSK-000001')).toBe('KSK-000001');
  });
});
