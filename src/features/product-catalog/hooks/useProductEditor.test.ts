import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  setProductCategories: vi.fn(),
}));

vi.mock('../repositories', () => ({
  productCatalogRepository: {
    createProduct: testContext.createProduct,
    updateProduct: testContext.updateProduct,
    setProductCategories: testContext.setProductCategories,
  },
}));

import { useProductEditor } from './useProductEditor';

describe('useProductEditor', () => {
  it('creates a Product and only sends categoryIds when at least one is selected', async () => {
    testContext.createProduct.mockResolvedValue({ id: 'product-1' });
    const { result } = renderHook(() => useProductEditor({ mode: 'create' }));

    await act(async () => {
      await result.current.submit({
        name: 'Berry Spark',
        brandId: null,
        shortDescription: null,
        isFeatured: false,
        isActive: true,
        categoryIds: [],
      });
    });

    expect(testContext.createProduct).toHaveBeenCalledWith({
      name: 'Berry Spark',
      brandId: null,
      shortDescription: null,
      isFeatured: false,
    });
    expect(testContext.setProductCategories).not.toHaveBeenCalled();
  });

  it('includes categoryIds on create when Categories are selected', async () => {
    testContext.createProduct.mockResolvedValue({ id: 'product-1' });
    const { result } = renderHook(() => useProductEditor({ mode: 'create' }));

    await act(async () => {
      await result.current.submit({
        name: 'Berry Spark',
        brandId: null,
        shortDescription: null,
        isFeatured: false,
        isActive: true,
        categoryIds: ['category-1'],
      });
    });

    expect(testContext.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({ categoryIds: ['category-1'] }),
    );
  });

  it('updates a Product and reassigns Categories in edit mode', async () => {
    testContext.updateProduct.mockResolvedValue({ id: 'product-1' });
    testContext.setProductCategories.mockResolvedValue(undefined);
    const { result } = renderHook(() => useProductEditor({ mode: 'edit', productId: 'product-1' }));

    await act(async () => {
      await result.current.submit({
        name: 'Berry Spark',
        brandId: 'brand-1',
        shortDescription: 'desc',
        isFeatured: true,
        isActive: false,
        categoryIds: ['category-2'],
      });
    });

    expect(testContext.updateProduct).toHaveBeenCalledWith('product-1', {
      name: 'Berry Spark',
      brandId: 'brand-1',
      shortDescription: 'desc',
      isFeatured: true,
      isActive: false,
    });
    expect(testContext.setProductCategories).toHaveBeenCalledWith('product-1', ['category-2']);
  });

  it('surfaces a failure message and keeps submitting state consistent', async () => {
    testContext.createProduct.mockRejectedValue(new Error('duplicate name'));
    const { result } = renderHook(() => useProductEditor({ mode: 'create' }));

    await act(async () => {
      await expect(
        result.current.submit({
          name: 'Berry Spark',
          brandId: null,
          shortDescription: null,
          isFeatured: false,
          isActive: true,
          categoryIds: [],
        }),
      ).rejects.toThrow('duplicate name');
    });

    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(result.current.error).toBe('duplicate name');
  });
});
