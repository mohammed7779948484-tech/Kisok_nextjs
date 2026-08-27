'use client';

import { useList } from '@refinedev/core';

import type { Database } from '@/infrastructure/supabase/database.types';

import type { OptionValueRecord } from '../types';

type OptionValueRow = Database['public']['Tables']['option_values']['Row'];

function mapOptionValue(row: OptionValueRow): OptionValueRecord {
  return {
    id: row.id,
    value: row.value,
    isActive: row.is_active,
    displayOrder: row.display_order,
  };
}

/**
 * The dependent-selection hook other workstreams (Variant Option UI) can
 * reuse: given an Option Type id, returns only its Values, unpaginated and
 * ordered — the complete scope the `reorder_items` RPC and a Variant Option
 * picker both need. Passing `undefined` skips the query entirely.
 */
export function useOptionValuesForType(optionTypeId: string | undefined) {
  const { query, result } = useList<OptionValueRow>({
    resource: 'option_values',
    filters: optionTypeId ? [{ field: 'option_type_id', operator: 'eq', value: optionTypeId }] : [],
    sorters: [{ field: 'display_order', order: 'asc' }],
    pagination: { mode: 'off' },
    queryOptions: { enabled: Boolean(optionTypeId), retry: false },
  });

  return {
    optionValues: result.data.map(mapOptionValue),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
