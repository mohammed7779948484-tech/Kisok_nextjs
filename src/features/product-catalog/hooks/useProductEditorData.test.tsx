import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listAssets: vi.fn(),
  listBrands: vi.fn(),
  listCategories: vi.fn(),
  listOptionTypes: vi.fn(),
  listVariantMedia: vi.fn(),
  getProduct: vi.fn(),
  listProductCategoryIds: vi.fn(),
  listVariantOptionValues: vi.fn(),
  listVariants: vi.fn(),
}));

vi.mock('@/features/catalog-taxonomy/repositories', () => ({
  catalogTaxonomyRepository: {
    listBrands: testContext.listBrands,
    listCategories: testContext.listCategories,
    listOptionTypes: testContext.listOptionTypes,
  },
}));

vi.mock('@/features/media-library/repositories', () => ({
  mediaLibraryRepository: {
    listAssets: testContext.listAssets,
    listVariantMedia: testContext.listVariantMedia,
  },
}));

vi.mock('../repositories', () => ({
  productCatalogRepository: {
    getProduct: testContext.getProduct,
    listProductCategoryIds: testContext.listProductCategoryIds,
    listVariantOptionValues: testContext.listVariantOptionValues,
    listVariants: testContext.listVariants,
  },
}));

import { useProductEditorData } from './useProductEditorData';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useProductEditorData', () => {
  it('loads Product editor references as ready context for a new draft', async () => {
    testContext.listBrands.mockResolvedValue([
      { id: 'brand-1', isActive: true, name: 'Northline' },
    ]);
    testContext.listCategories.mockResolvedValue([]);
    testContext.listOptionTypes.mockResolvedValue([]);
    testContext.listAssets.mockResolvedValue([]);

    const { result } = renderHook(() => useProductEditorData({ mode: 'create' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.references.status).toBe('ready'));

    expect(result.current.references.brands).toEqual([
      { id: 'brand-1', isActive: true, name: 'Northline' },
    ]);
    expect(result.current.product.status).toBe('not-requested');
    expect(result.current.variants.status).toBe('not-requested');
  });

  it('loads selected Option Values with the current Variant query key for an existing Product', async () => {
    testContext.listBrands.mockResolvedValue([]);
    testContext.listCategories.mockResolvedValue([]);
    testContext.listOptionTypes.mockResolvedValue([
      {
        id: 'flavor',
        isActive: true,
        name: 'Flavor',
        values: [{ id: 'berry', isActive: true, value: 'Berry' }],
      },
    ]);
    testContext.listAssets.mockResolvedValue([]);
    testContext.getProduct.mockResolvedValue({
      brandId: null,
      coverMediaAssetId: null,
      id: 'product-1',
      isActive: false,
      isFeatured: false,
      name: 'Citrus Spark',
      searchKeywords: [],
      shortDescription: null,
    });
    testContext.listProductCategoryIds.mockResolvedValue([]);
    testContext.listVariants.mockResolvedValue([
      {
        barcode: null,
        id: 'variant-1',
        isActive: true,
        lowStockThreshold: null,
        productId: 'product-1',
        sku: 'KSK-000001',
        titleOverride: null,
      },
    ]);
    testContext.listVariantMedia.mockResolvedValue([
      {
        asset: {
          format: 'webp',
          height: 640,
          publicId: 'products/citrus',
          secureUrl: 'https://example.test/citrus.webp',
          width: 640,
        },
        createdAt: '2026-08-27T00:00:00Z',
        displayOrder: 1,
        isPrimary: true,
        mediaAssetId: 'media-1',
        variantId: 'variant-1',
      },
    ]);
    testContext.listVariantOptionValues.mockResolvedValue([
      {
        optionTypeId: 'flavor',
        optionTypeName: 'Flavor',
        optionValueId: 'berry',
        optionValueName: 'Berry',
      },
    ]);

    const { result } = renderHook(
      () => useProductEditorData({ mode: 'edit', productId: 'product-1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.variantOptions.status).toBe('ready'));

    expect(result.current.variantOptions.byVariantId).toEqual({
      'variant-1': [
        {
          optionTypeId: 'flavor',
          optionTypeName: 'Flavor',
          optionValueId: 'berry',
          optionValueName: 'Berry',
        },
      ],
    });
    expect(result.current.variantMediaCounts).toEqual({ 'variant-1': 1 });
    expect(result.current.variantEligibilityById).toEqual({
      'variant-1': { isCustomerEligible: true, reasons: [] },
    });
  });

  it('does not fetch the entire Media Library while initializing a new Product draft', async () => {
    testContext.listAssets.mockRejectedValue(new Error('Unbounded media fetch must not run.'));
    testContext.listBrands.mockResolvedValue([]);
    testContext.listCategories.mockResolvedValue([]);
    testContext.listOptionTypes.mockResolvedValue([]);

    const { result } = renderHook(() => useProductEditorData({ mode: 'create' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.references.status).toBe('ready'));
    expect(testContext.listAssets).not.toHaveBeenCalled();
  });
});
