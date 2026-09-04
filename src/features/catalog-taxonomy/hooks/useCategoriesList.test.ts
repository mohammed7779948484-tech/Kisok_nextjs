import type { CrudFilters, CrudSorting, DataProvider, Pagination } from '@refinedev/core';
import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createMockDataProvider, renderHookWithRefine } from '../../../../test/refine-test-utils';
import { useCategoriesList } from './useCategoriesList';

const categoryRow = {
  id: 'category-1',
  name: 'Coffee',
  parent_id: null,
  is_active: true,
  display_order: 0,
  image_media_asset_id: null,
};

describe('useCategoriesList', () => {
  it('lists categories mapped to the app shape, using Refine list state', async () => {
    const getList = vi.fn(async (_params: unknown) => ({ data: [categoryRow], total: 1 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    const { result } = renderHookWithRefine(
      () => useCategoriesList({ search: '', page: 1 }),
      dataProvider,
      ['categories'],
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.categories).toEqual([
      {
        id: 'category-1',
        name: 'Coffee',
        parentId: null,
        isActive: true,
        displayOrder: 0,
        imageMediaAssetId: null,
        imageUrl: null,
        imagePublicId: null,
      },
    ]);
    expect(result.current.total).toBe(1);
    expect(getList).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'categories',
        meta: expect.objectContaining({
          select: '*, media_assets:image_media_asset_id(id, secure_url, public_id)',
        }),
      }),
    );
  });

  it('sends a contains filter on name when a search term is provided', async () => {
    const getList = vi.fn(async (_params: unknown) => ({ data: [], total: 0 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    const { result } = renderHookWithRefine(
      () => useCategoriesList({ search: 'coffee', page: 1 }),
      dataProvider,
      ['categories'],
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const call = getList.mock.calls[0][0] as { filters?: CrudFilters };
    expect(call.filters).toEqual([{ field: 'name', operator: 'contains', value: 'coffee' }]);
  });

  it('sends no filters when search is blank and parentId is not constrained', async () => {
    const getList = vi.fn(async (_params: unknown) => ({ data: [], total: 0 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    const { result } = renderHookWithRefine(
      () => useCategoriesList({ search: '   ', page: 1 }),
      dataProvider,
      ['categories'],
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const call = getList.mock.calls[0][0] as { filters?: CrudFilters };
    expect(call.filters).toEqual([]);
  });

  it('filters to root categories when parentId is null', async () => {
    const getList = vi.fn(async (_params: unknown) => ({ data: [], total: 0 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    const { result } = renderHookWithRefine(
      () => useCategoriesList({ search: '', page: 1, parentId: null }),
      dataProvider,
      ['categories'],
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const call = getList.mock.calls[0][0] as { filters?: CrudFilters };
    expect(call.filters).toEqual([{ field: 'parent_id', operator: 'null', value: true }]);
  });

  it('filters to a specific parent when parentId is a string', async () => {
    const getList = vi.fn(async (_params: unknown) => ({ data: [], total: 0 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    const { result } = renderHookWithRefine(
      () => useCategoriesList({ search: '', page: 1, parentId: 'category-1' }),
      dataProvider,
      ['categories'],
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const call = getList.mock.calls[0][0] as { filters?: CrudFilters };
    expect(call.filters).toEqual([{ field: 'parent_id', operator: 'eq', value: 'category-1' }]);
  });

  it('requests server-side pagination and sorts by display_order', async () => {
    const getList = vi.fn(async (_params: unknown) => ({ data: [], total: 0 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    const { result } = renderHookWithRefine(
      () => useCategoriesList({ search: '', page: 2, pageSize: 5 }),
      dataProvider,
      ['categories'],
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const call = getList.mock.calls[0][0] as { pagination?: Pagination; sorters?: CrudSorting };
    expect(call.pagination).toEqual({ currentPage: 2, pageSize: 5, mode: 'server' });
    expect(call.sorters).toEqual([{ field: 'display_order', order: 'asc' }]);
  });
});
