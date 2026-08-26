'use client';

import { useList } from '@refinedev/core';

import type { Database } from '@/infrastructure/supabase/database.types';

import type { BrandRecord } from '../types';

type BrandRow = Database['public']['Tables']['brands']['Row'];

function mapBrand(row: BrandRow): BrandRecord {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    displayOrder: row.display_order,
    imageMediaAssetId: row.image_media_asset_id,
  };
}

export const BRANDS_PAGE_SIZE = 20;

/**
 * Reference Refine orchestration for a simple table-shaped resource: list
 * state (search/pagination/sort), loading/error, and cache invalidation
 * after mutations are all owned by `useList` + TanStack Query — this
 * component never calls `useState`/`useEffect` to manage that lifecycle.
 */
export function useBrandsList(params: { search: string; page: number; pageSize?: number }) {
  const pageSize = params.pageSize ?? BRANDS_PAGE_SIZE;
  const trimmedSearch = params.search.trim();

  const { query, result } = useList<BrandRow>({
    resource: 'brands',
    filters: trimmedSearch ? [{ field: 'name', operator: 'contains', value: trimmedSearch }] : [],
    sorters: [{ field: 'display_order', order: 'asc' }],
    pagination: { currentPage: params.page, pageSize, mode: 'server' },
  });

  return {
    brands: result.data.map(mapBrand),
    total: result.total ?? 0,
    pageSize,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
