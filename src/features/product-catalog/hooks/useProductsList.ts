'use client';

import { useCallback, useEffect, useState } from 'react';

import { productCatalogRepository } from '../repositories';
import type { ProductRecord } from '../types';

export const PRODUCTS_PAGE_SIZE = 20;

/**
 * `listProducts()` already does a two-query, domain-aware aggregation
 * (Product + active-Variant stock/threshold projection shared with the
 * Dashboard) that a generic Refine `useList` select can't reproduce without
 * duplicating that logic client-side. Search/pagination are therefore
 * applied in-memory over the single fetched list rather than pushed to
 * Supabase — a deliberate simplification appropriate for a single store's
 * catalog size, not a full server-side `useTable` migration.
 */
export function useProductsList(params: { search: string; page: number; pageSize?: number }) {
  const pageSize = params.pageSize ?? PRODUCTS_PAGE_SIZE;
  const [allProducts, setAllProducts] = useState<ProductRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      setAllProducts(await productCatalogRepository.listProducts());
    } catch (caughtError) {
      setIsError(true);
      setError(caughtError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const trimmedSearch = params.search.trim().toLowerCase();
  const filtered = trimmedSearch
    ? allProducts.filter((product) => product.name.toLowerCase().includes(trimmedSearch))
    : allProducts;
  const total = filtered.length;
  const start = (params.page - 1) * pageSize;

  return {
    products: filtered.slice(start, start + pageSize),
    total,
    pageSize,
    isLoading,
    isError,
    error,
    refetch,
  };
}
