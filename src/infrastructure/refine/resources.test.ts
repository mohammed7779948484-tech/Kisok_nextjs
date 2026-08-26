import { describe, expect, it } from 'vitest';

import { refineResources } from './resources';

describe('Refine resource mapping', () => {
  it('uses actual Lean V2 table names for database-backed resources', () => {
    expect(refineResources.map((resource) => resource.name)).toEqual([
      'brands',
      'categories',
      'option_types',
      'option_values',
      'products',
      'product_categories',
      'product_variants',
      'variant_option_values',
      'product_variant_media',
      'inventory',
      'inventory_adjustments',
      'orders',
      'media_assets',
      'profiles',
      'store_settings',
    ]);
    expect(refineResources.find((resource) => resource.name === 'profiles')?.meta).toMatchObject({
      feature: 'admin-users',
      privileged: true,
    });
  });
});
