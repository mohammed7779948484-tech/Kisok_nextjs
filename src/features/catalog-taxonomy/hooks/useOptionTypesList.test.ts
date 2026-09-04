import type { CrudFilters, CrudSorting, DataProvider, Pagination } from '@refinedev/core';
import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createMockDataProvider, renderHookWithRefine } from '../../../../test/refine-test-utils';
import { useOptionTypesList } from './useOptionTypesList';

const optionTypeRow = {
  id: 'option-type-1',
  name: 'Roast profile',
  is_active: true,
  display_order: 0,
};

describe('useOptionTypesList', () => {
  it('lists option types mapped to the app shape, using Refine list state', async () => {
    const getList = vi.fn(async (_params: unknown) => ({ data: [optionTypeRow], total: 1 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    const { result } = renderHookWithRefine(
      () => useOptionTypesList({ search: '', page: 1 }),
      dataProvider,
      ['option_types'],
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.optionTypes).toEqual([
      { id: 'option-type-1', name: 'Roast profile', isActive: true, displayOrder: 0 },
    ]);
    expect(result.current.total).toBe(1);
    expect(getList).toHaveBeenCalledWith(expect.objectContaining({ resource: 'option_types' }));
  });

  it('sends a contains filter on name when a search term is provided', async () => {
    const getList = vi.fn(async (_params: unknown) => ({ data: [], total: 0 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    const { result } = renderHookWithRefine(
      () => useOptionTypesList({ search: 'roast', page: 1 }),
      dataProvider,
      ['option_types'],
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const call = getList.mock.calls[0][0] as { filters?: CrudFilters };
    expect(call.filters).toEqual([{ field: 'name', operator: 'contains', value: 'roast' }]);
  });

  it('requests server-side pagination and sorts by display_order', async () => {
    const getList = vi.fn(async (_params: unknown) => ({ data: [], total: 0 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    const { result } = renderHookWithRefine(
      () => useOptionTypesList({ search: '', page: 2, pageSize: 5 }),
      dataProvider,
      ['option_types'],
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const call = getList.mock.calls[0][0] as { pagination?: Pagination; sorters?: CrudSorting };
    expect(call.pagination).toEqual({ currentPage: 2, pageSize: 5, mode: 'server' });
    expect(call.sorters).toEqual([{ field: 'display_order', order: 'asc' }]);
  });
});
