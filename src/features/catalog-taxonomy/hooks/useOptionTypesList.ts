'use client';

import { useList } from '@refinedev/core';

import type { Database } from '@/infrastructure/supabase/database.types';

import type { OptionTypeRecord } from '../types';

type OptionTypeRow = Database['public']['Tables']['option_types']['Row'];

function mapOptionType(row: OptionTypeRow): Omit<OptionTypeRecord, 'values'> {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    displayOrder: row.display_order,
  };
}

export const OPTION_TYPES_PAGE_SIZE = 20;

/** Same Refine orchestration as `useBrandsList`, against `option_types`. */
export function useOptionTypesList(params: { search: string; page: number; pageSize?: number }) {
  const pageSize = params.pageSize ?? OPTION_TYPES_PAGE_SIZE;
  const trimmedSearch = params.search.trim();

  const { query, result } = useList<OptionTypeRow>({
    resource: 'option_types',
    filters: trimmedSearch ? [{ field: 'name', operator: 'contains', value: trimmedSearch }] : [],
    sorters: [{ field: 'display_order', order: 'asc' }],
    pagination: { currentPage: params.page, pageSize, mode: 'server' },
  });

  return {
    optionTypes: result.data.map(mapOptionType),
    total: result.total ?? 0,
    pageSize,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
