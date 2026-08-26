import type { DataProvider } from '@refinedev/core';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listCategories: vi.fn(),
  reorderCategories: vi.fn(),
}));

vi.mock('../repositories', () => ({
  catalogTaxonomyRepository: {
    listCategories: testContext.listCategories,
    reorderCategories: testContext.reorderCategories,
  },
}));

import { createMockDataProvider, renderWithRefine } from '../../../../test/refine-test-utils';
import { CatalogTaxonomyPanel } from './CatalogTaxonomyPanel';

const rootRow = {
  id: 'category-1',
  name: 'Coffee',
  parent_id: null,
  is_active: true,
  display_order: 0,
  image_media_asset_id: null,
};

const childRow = {
  id: 'category-2',
  name: 'Espresso',
  parent_id: 'category-1',
  is_active: true,
  display_order: 1,
  image_media_asset_id: null,
};

describe('CatalogTaxonomyPanel (Categories)', () => {
  it('renders hosted Categories through Refine list state, indicating hierarchy', async () => {
    const getList = vi.fn(async () => ({ data: [rootRow, childRow], total: 2 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    renderWithRefine(<CatalogTaxonomyPanel />, dataProvider, ['categories']);

    expect(await screen.findByText('Coffee')).toBeInTheDocument();
    expect(screen.getByText('Espresso')).toBeInTheDocument();
    expect(screen.getByText('Root')).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();
  });

  it('debounces search input into a single contains-filtered list request', async () => {
    const user = userEvent.setup();
    const getList = vi.fn(async (_params: unknown) => ({ data: [], total: 0 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    renderWithRefine(<CatalogTaxonomyPanel />, dataProvider, ['categories']);
    await waitFor(() => expect(getList).toHaveBeenCalled());
    const callsBeforeTyping = getList.mock.calls.length;

    await user.type(screen.getByPlaceholderText('Search categories'), 'cof');

    await waitFor(
      () => {
        expect(getList.mock.calls.length).toBeGreaterThan(callsBeforeTyping);
        const lastCall = getList.mock.calls.at(-1)?.[0] as { filters?: unknown } | undefined;
        expect(lastCall?.filters).toEqual(
          expect.arrayContaining([{ field: 'name', operator: 'contains', value: 'cof' }]),
        );
      },
      { timeout: 2000 },
    );
  });

  it('creates a root Category through the shared Refine data provider', async () => {
    const getList = vi
      .fn()
      .mockResolvedValueOnce({ data: [], total: 0 })
      .mockResolvedValueOnce({ data: [], total: 0 })
      .mockResolvedValueOnce({ data: [rootRow], total: 1 })
      .mockResolvedValue({ data: [rootRow], total: 1 });
    const create = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { id: 'category-1', ...(variables as object) },
    }));
    const dataProvider = createMockDataProvider({
      getList: getList as DataProvider['getList'],
      create: create as DataProvider['create'],
    });

    const user = userEvent.setup();
    renderWithRefine(<CatalogTaxonomyPanel />, dataProvider, ['categories']);

    await user.click(await screen.findByRole('button', { name: 'Add category' }));
    await user.type(screen.getByLabelText('Category name'), 'Coffee');
    await user.click(screen.getByRole('button', { name: 'Save category' }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'categories',
          variables: { name: 'Coffee', parent_id: null, is_active: true },
        }),
      ),
    );
  });

  it('creates a child Category by choosing a root parent from the Select', async () => {
    const getList = vi.fn(async () => ({ data: [rootRow], total: 1 }));
    const create = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { id: 'category-2', ...(variables as object) },
    }));
    const dataProvider = createMockDataProvider({
      getList: getList as DataProvider['getList'],
      create: create as DataProvider['create'],
    });

    const user = userEvent.setup();
    renderWithRefine(<CatalogTaxonomyPanel />, dataProvider, ['categories']);

    await screen.findByText('Coffee');
    await user.click(screen.getByRole('button', { name: 'Add category' }));
    await user.type(screen.getByLabelText('Category name'), 'Espresso');
    await user.click(screen.getByRole('combobox', { name: 'Parent category' }));
    await user.click(await screen.findByRole('option', { name: 'Coffee' }));
    await user.click(screen.getByRole('button', { name: 'Save category' }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'categories',
          variables: { name: 'Espresso', parent_id: 'category-1', is_active: true },
        }),
      ),
    );
  });

  it('only offers root categories as parent choices', async () => {
    const getList = vi.fn(
      async (params: { filters?: Array<{ field: string; operator: string }> }) => {
        const isRootOnly = params.filters?.some(
          (filter) => filter.field === 'parent_id' && filter.operator === 'null',
        );
        return isRootOnly ? { data: [rootRow], total: 1 } : { data: [rootRow, childRow], total: 2 };
      },
    );
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    const user = userEvent.setup();
    renderWithRefine(<CatalogTaxonomyPanel />, dataProvider, ['categories']);

    await screen.findByText('Coffee');
    await user.click(screen.getByRole('button', { name: 'Add category' }));
    await user.click(screen.getByRole('combobox', { name: 'Parent category' }));

    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).queryByText('Espresso')).not.toBeInTheDocument();
    expect(within(listbox).getByText('Coffee')).toBeInTheDocument();
  });

  it('toggles a Category active state without opening the edit form', async () => {
    const getList = vi.fn(async () => ({ data: [rootRow], total: 1 }));
    const update = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { ...rootRow, ...(variables as object) },
    }));
    const dataProvider = createMockDataProvider({
      getList: getList as DataProvider['getList'],
      update: update as DataProvider['update'],
    });

    const user = userEvent.setup();
    renderWithRefine(<CatalogTaxonomyPanel />, dataProvider, ['categories']);

    await user.click(await screen.findByRole('button', { name: 'Deactivate Coffee' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'categories',
          id: 'category-1',
          variables: { is_active: false },
        }),
      ),
    );
  });

  it('reorders a Category by calling the reorder_items RPC through the repository', async () => {
    const getList = vi.fn(async () => ({ data: [rootRow, childRow], total: 2 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });
    testContext.listCategories.mockResolvedValue([
      { id: 'category-1', name: 'Coffee', parentId: null, isActive: true, displayOrder: 0 },
      { id: 'category-3', name: 'Tea', parentId: null, isActive: true, displayOrder: 1 },
    ]);
    testContext.reorderCategories.mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderWithRefine(<CatalogTaxonomyPanel />, dataProvider, ['categories']);

    await screen.findByText('Coffee');
    await user.click(screen.getByRole('button', { name: 'Move Coffee down' }));

    await waitFor(() =>
      expect(testContext.reorderCategories).toHaveBeenCalledWith(null, [
        'category-3',
        'category-1',
      ]),
    );
  });
});
