'use client';

import { useCallback, useEffect, useState } from 'react';

import { productCatalogRepository } from '../repositories';
import type { ProductRecord } from '../types';

export const PRODUCTS_PAGE_SIZE = 20;

/** Matches the operational identifiers an Admin actually searches by in a
 * single-store catalog: Product name, Brand, curated search keywords, and
 * every Variant's SKU/barcode — not just the Product name. */
function productMatchesSearch(product: ProductRecord, normalizedSearch: string): boolean {
  const haystacks = [
    product.name,
    product.brandName ?? '',
    ...product.searchKeywords,
    ...product.variantSkus,
    ...product.variantBarcodes,
  ];
  return haystacks.some((value) => value.toLowerCase().includes(normalizedSearch));
}

/**
 * `listProducts()` already does a two-query, domain-aware aggregation
 * (Product + active-Variant stock/threshold projection shared with the
 * Dashboard) that a generic Refine `useList` select can't reproduce without
 * duplicating that logic client-side. Search/pagination are therefore
 * applied in-memory over the single fetched list rather than pushed to
 * Supabase — a deliberate simplification appropriate for a single store's
 * catalog size, not a full server-side `useTable` migration. Search covers
 * every operational identifier an Admin actually looks products up by —
 * name, Brand, curated search keywords, and Variant SKU/barcode — not just
 * the Product name.
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
    ? allProducts.filter((product) => productMatchesSearch(product, trimmedSearch))
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
