import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({ listProducts: vi.fn() }));

vi.mock('../repositories', () => ({
  productCatalogRepository: { listProducts: testContext.listProducts },
}));

import { useProductsList } from './useProductsList';

const PRODUCTS = Array.from({ length: 25 }, (_, index) => ({
  id: `product-${index}`,
  name: index === 0 ? 'Berry Spark' : `Cedar Roast ${index}`,
  brandName: null,
  variantCount: 0,
  availableStock: 0,
  status: 'In stock' as const,
  isActive: true,
  isFeatured: false,
}));

describe('useProductsList', () => {
  it('loads Products and reports the unfiltered total', async () => {
    testContext.listProducts.mockResolvedValue(PRODUCTS);

    const { result } = renderHook(() => useProductsList({ search: '', page: 1 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.total).toBe(25);
    expect(result.current.products).toHaveLength(20);
  });

  it('filters by a name contains-match, case-insensitively', async () => {
    testContext.listProducts.mockResolvedValue(PRODUCTS);

    const { result } = renderHook(() => useProductsList({ search: 'berry', page: 1 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.total).toBe(1);
    expect(result.current.products.map((product) => product.name)).toEqual(['Berry Spark']);
  });

  it('paginates the filtered set', async () => {
    testContext.listProducts.mockResolvedValue(PRODUCTS);

    const { result } = renderHook(() => useProductsList({ search: '', page: 2, pageSize: 20 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.products).toHaveLength(5);
  });

  it('reports an error state when the repository rejects', async () => {
    testContext.listProducts.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useProductsList({ search: '', page: 1 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(true);
    expect(result.current.products).toEqual([]);
  });
});
