import type { CrudFilters, CrudSorting, DataProvider, Pagination } from '@refinedev/core';
import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createMockDataProvider, renderHookWithRefine } from '../../../../test/refine-test-utils';
import { useBrandsList } from './useBrandsList';

const brandRow = {
  id: 'brand-1',
  name: 'Northline',
  is_active: true,
  display_order: 0,
  image_media_asset_id: null,
};

describe('useBrandsList', () => {
  it('lists brands mapped to the app shape, using Refine list state (no manual useState/useEffect)', async () => {
    const getList = vi.fn(async (_params: unknown) => ({ data: [brandRow], total: 1 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    const { result } = renderHookWithRefine(
      () => useBrandsList({ search: '', page: 1 }),
      dataProvider,
      ['brands'],
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.brands).toEqual([
      {
        id: 'brand-1',
        name: 'Northline',
        isActive: true,
        displayOrder: 0,
        imageMediaAssetId: null,
      },
    ]);
    expect(result.current.total).toBe(1);
    expect(getList).toHaveBeenCalledWith(expect.objectContaining({ resource: 'brands' }));
  });

  it('sends a contains filter on name when a search term is provided', async () => {
    const getList = vi.fn(async (_params: unknown) => ({ data: [], total: 0 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    const { result } = renderHookWithRefine(
      () => useBrandsList({ search: 'north', page: 1 }),
      dataProvider,
      ['brands'],
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getList).toHaveBeenCalled();
    const call = getList.mock.calls[0][0] as { filters?: CrudFilters };
    expect(call.filters).toEqual([{ field: 'name', operator: 'contains', value: 'north' }]);
  });

  it('sends no filters when the search term is blank', async () => {
    const getList = vi.fn(async (_params: unknown) => ({ data: [], total: 0 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    const { result } = renderHookWithRefine(
      () => useBrandsList({ search: '   ', page: 1 }),
      dataProvider,
      ['brands'],
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getList).toHaveBeenCalled();
    const call = getList.mock.calls[0][0] as { filters?: CrudFilters };
    expect(call.filters).toEqual([]);
  });

  it('requests server-side pagination and sorts by display_order', async () => {
    const getList = vi.fn(async (_params: unknown) => ({ data: [], total: 0 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    const { result } = renderHookWithRefine(
      () => useBrandsList({ search: '', page: 2, pageSize: 5 }),
      dataProvider,
      ['brands'],
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getList).toHaveBeenCalled();
    const call = getList.mock.calls[0][0] as { pagination?: Pagination; sorters?: CrudSorting };
    expect(call.pagination).toEqual({ currentPage: 2, pageSize: 5, mode: 'server' });
    expect(call.sorters).toEqual([{ field: 'display_order', order: 'asc' }]);
  });
});
