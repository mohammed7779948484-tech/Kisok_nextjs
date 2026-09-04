import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listAssets: vi.fn(),
  listBrands: vi.fn(),
  listCategories: vi.fn(),
  listOptionTypes: vi.fn(),
  listVariantMediaCounts: vi.fn(),
  getProduct: vi.fn(),
  listProductCategoryIds: vi.fn(),
  listVariantOptionValuesForVariants: vi.fn(),
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
    listVariantMediaCounts: testContext.listVariantMediaCounts,
  },
}));

vi.mock('../repositories', () => ({
  productCatalogRepository: {
    getProduct: testContext.getProduct,
    listProductCategoryIds: testContext.listProductCategoryIds,
    listVariantOptionValuesForVariants: testContext.listVariantOptionValuesForVariants,
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    testContext.listVariantMediaCounts.mockResolvedValue({ 'variant-1': 1 });
    testContext.listVariantOptionValuesForVariants.mockResolvedValue({
      'variant-1': [
        {
          optionTypeId: 'flavor',
          optionTypeName: 'Flavor',
          optionValueId: 'berry',
          optionValueName: 'Berry',
        },
      ],
    });

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

  it('batches Variant Media and Option Value reads into one query per Product instead of one per Variant', async () => {
    testContext.listBrands.mockResolvedValue([]);
    testContext.listCategories.mockResolvedValue([]);
    testContext.listOptionTypes.mockResolvedValue([]);
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
      {
        barcode: null,
        id: 'variant-2',
        isActive: true,
        lowStockThreshold: null,
        productId: 'product-1',
        sku: 'KSK-000002',
        titleOverride: null,
      },
    ]);
    testContext.listVariantMediaCounts.mockResolvedValue({ 'variant-1': 1 });
    testContext.listVariantOptionValuesForVariants.mockResolvedValue({});

    const { result } = renderHook(
      () => useProductEditorData({ mode: 'edit', productId: 'product-1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.variantOptions.status).toBe('ready'));

    // Exactly one batched call for both Variants — never one call per Variant.
    expect(testContext.listVariantMediaCounts).toHaveBeenCalledTimes(1);
    expect(testContext.listVariantMediaCounts).toHaveBeenCalledWith(['variant-1', 'variant-2']);
    expect(testContext.listVariantOptionValuesForVariants).toHaveBeenCalledTimes(1);
    expect(testContext.listVariantOptionValuesForVariants).toHaveBeenCalledWith([
      'variant-1',
      'variant-2',
    ]);
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
