import { describe, expect, it } from 'vitest';

import { deferredDataProvider, RefineDeferredProviderError } from './deferred-data-provider';
import { refineResources } from './resources';

describe('Kisok Refine runtime', () => {
  it('declares feature-owned resource names without replacing local panel routes', () => {
    expect(refineResources.map((resource) => resource.name)).toEqual([
      'brands',
      'categories',
      'option-types',
      'option-values',
      'products',
      'product-categories',
      'product-variants',
      'variant-option-values',
      'product-variant-media',
      'inventory',
      'inventory-adjustments',
      'orders',
      'media-assets',
      'admin-users',
      'store-settings',
    ]);
  });

  it('prevents CRUD calls until the Supabase data-provider phase is explicitly enabled', async () => {
    await expect(deferredDataProvider.getList({ resource: 'products' })).rejects.toBeInstanceOf(
      RefineDeferredProviderError,
    );

    expect(deferredDataProvider.getApiUrl()).toBe('deferred://supabase-not-configured');
  });
});
