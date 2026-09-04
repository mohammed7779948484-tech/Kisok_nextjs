'use client';

import type { CrudFilters } from '@refinedev/core';
import { useList } from '@refinedev/core';

import type { Database } from '@/infrastructure/supabase/database.types';

import type { CategoryRecord } from '../types';

type CategoryRow = Database['public']['Tables']['categories']['Row'] & {
  media_assets?: {
    id: string;
    public_id: string;
    secure_url: string;
  } | null;
};

function mapCategory(row: CategoryRow): CategoryRecord {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    isActive: row.is_active,
    displayOrder: row.display_order,
    imageMediaAssetId: row.image_media_asset_id,
    imageUrl: row.media_assets?.secure_url ?? null,
    imagePublicId: row.media_assets?.public_id ?? null,
  };
}

export const CATEGORIES_PAGE_SIZE = 20;

/**
 * Same Refine orchestration as `useBrandsList`, with an optional `parentId`
 * scope filter: `null` restricts to root categories, a string id restricts
 * to that root's children, and `undefined` leaves the hierarchy unfiltered.
 */
export function useCategoriesList(params: {
  search: string;
  page: number;
  pageSize?: number;
  parentId?: string | null;
}) {
  const pageSize = params.pageSize ?? CATEGORIES_PAGE_SIZE;
  const trimmedSearch = params.search.trim();

  const filters: CrudFilters = [];
  if (trimmedSearch) filters.push({ field: 'name', operator: 'contains', value: trimmedSearch });
  if (params.parentId !== undefined) {
    filters.push(
      params.parentId === null
        ? { field: 'parent_id', operator: 'null', value: true }
        : { field: 'parent_id', operator: 'eq', value: params.parentId },
    );
  }

  const { query, result } = useList<CategoryRow>({
    resource: 'categories',
    meta: {
      select: '*, media_assets:image_media_asset_id(id, secure_url, public_id)',
    },
    filters,
    sorters: [{ field: 'display_order', order: 'asc' }],
    pagination: { currentPage: params.page, pageSize, mode: 'server' },
  });

  return {
    categories: result.data.map(mapCategory),
    total: result.total ?? 0,
    pageSize,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
