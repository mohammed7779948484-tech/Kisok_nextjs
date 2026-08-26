import { describe, expect, it } from 'vitest';

import { refineResources } from './resources';

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Kisok Refine runtime', () => {
  it('declares feature-owned resource names without replacing local panel routes', () => {
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
  });

  it('uses only the hosted Supabase provider in the active runtime', () => {
    const projectRoot = resolve(import.meta.dirname, '../../..');
    const providerSource = readFileSync(
      resolve(projectRoot, 'src/providers/RefineProvider.tsx'),
      'utf8',
    );

    expect(providerSource).not.toContain('deferred-data-provider');
    expect(
      existsSync(resolve(projectRoot, 'src/infrastructure/refine/deferred-data-provider.ts')),
    ).toBe(false);
  });

  it('keeps the root provider directive singular', () => {
    const projectRoot = resolve(import.meta.dirname, '../../..');
    const rootProviderSource = readFileSync(
      resolve(projectRoot, 'src/providers/RootProvider.tsx'),
      'utf8',
    );

    expect(rootProviderSource.match(/^'use client';$/gm)).toHaveLength(1);
  });
});
