import type { ReactElement } from 'react';

import type { DataProvider } from '@refinedev/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listCategories: vi.fn(),
  reorderCategories: vi.fn(),
  listAssetsPage: vi.fn(),
  registerAsset: vi.fn(),
  getMediaUploadSignature: vi.fn(),
}));

vi.mock('../repositories', () => ({
  catalogTaxonomyRepository: {
    listCategories: testContext.listCategories,
    reorderCategories: testContext.reorderCategories,
  },
}));

vi.mock('../../media-library/repositories', () => ({
  mediaLibraryRepository: {
    listAssetsPage: testContext.listAssetsPage,
    registerAsset: testContext.registerAsset,
  },
}));

vi.mock('../../media-library/server/actions', () => ({
  getMediaUploadSignature: testContext.getMediaUploadSignature,
}));

import { createMockDataProvider, renderWithRefine } from '../../../../test/refine-test-utils';
import { CatalogTaxonomyPanel } from './CatalogTaxonomyPanel';

function renderCatalogTaxonomyPanel(dataProvider: DataProvider) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithRefine(
    (
      <QueryClientProvider client={queryClient}>
        <CatalogTaxonomyPanel />
      </QueryClientProvider>
    ) as ReactElement,
    dataProvider,
    ['categories'],
  );
}

const rootRow = {
  id: 'category-1',
  name: 'Coffee',
  parent_id: null,
  is_active: true,
  display_order: 0,
  image_media_asset_id: 'asset-1',
  media_assets: {
    id: 'asset-1',
    public_id: 'categories/coffee-icon',
    secure_url: 'https://res.cloudinary.com/example/image/upload/coffee.jpg',
  },
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
  beforeEach(() => {
    testContext.listCategories.mockReset();
    testContext.reorderCategories.mockReset();
    testContext.listAssetsPage.mockReset();
    testContext.registerAsset.mockReset();
    testContext.getMediaUploadSignature.mockReset();
    testContext.listAssetsPage.mockResolvedValue({ assets: [], total: 0 });
  });

  it('renders hosted Categories through Refine list state, indicating hierarchy and thumbnails', async () => {
    const getList = vi.fn(async () => ({ data: [rootRow, childRow], total: 2 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    renderCatalogTaxonomyPanel(dataProvider);

    expect(await screen.findByText('Coffee')).toBeInTheDocument();
    expect(screen.getByText('Espresso')).toBeInTheDocument();
    expect(screen.getByText('Root')).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();

    const logoImg = screen.getByRole('img', { name: 'Coffee' });
    expect(logoImg).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/example/image/upload/coffee.jpg',
    );
  });

  it('debounces search input into a single contains-filtered list request', async () => {
    const user = userEvent.setup();
    const getList = vi.fn(async (_params: unknown) => ({ data: [], total: 0 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    renderCatalogTaxonomyPanel(dataProvider);
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

  it('creates a root Category through the shared Refine data provider and allows selecting an image', async () => {
    testContext.listAssetsPage.mockResolvedValue({
      assets: [
        {
          id: 'asset-tea',
          publicId: 'categories/tea-icon',
          secureUrl: 'https://res.cloudinary.com/example/image/upload/tea.jpg',
          format: 'jpg',
          width: 300,
          height: 300,
        },
      ],
      total: 1,
    });

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
    renderCatalogTaxonomyPanel(dataProvider);

    await user.click(await screen.findByRole('button', { name: 'Add category' }));
    await user.type(screen.getByLabelText('Category name'), 'Tea');

    // Open the canonical Media Picker dialog and select image
    await user.click(screen.getByRole('button', { name: 'Choose from library' }));
    expect(await screen.findByText('Select Category Image')).toBeInTheDocument();
    await screen.findByText('categories/tea-icon');
    await user.click(screen.getByRole('button', { name: 'Select categories/tea-icon' }));
    await user.click(screen.getByRole('button', { name: 'Use selected image' }));

    await user.click(screen.getByRole('button', { name: 'Save category' }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'categories',
          variables: {
            name: 'Tea',
            parent_id: null,
            is_active: true,
            image_media_asset_id: 'asset-tea',
          },
        }),
      ),
    );
  });

  it('creates a child Category by choosing a root parent from the searchable list', async () => {
    const getList = vi.fn(async () => ({ data: [rootRow], total: 1 }));
    const create = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { id: 'category-2', ...(variables as object) },
    }));
    const dataProvider = createMockDataProvider({
      getList: getList as DataProvider['getList'],
      create: create as DataProvider['create'],
    });

    const user = userEvent.setup();
    renderCatalogTaxonomyPanel(dataProvider);

    await screen.findByText('Coffee');
    await user.click(screen.getByRole('button', { name: 'Add category' }));
    await user.type(screen.getByLabelText('Category name'), 'Espresso');
    await user.click(await screen.findByRole('option', { name: 'Coffee' }));
    await user.click(screen.getByRole('button', { name: 'Save category' }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'categories',
          variables: {
            name: 'Espresso',
            parent_id: 'category-1',
            is_active: true,
            image_media_asset_id: null,
          },
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
    renderCatalogTaxonomyPanel(dataProvider);

    await screen.findByText('Coffee');
    await user.click(screen.getByRole('button', { name: 'Add category' }));

    const listbox = await screen.findByRole('listbox', { name: 'Parent category' });
    expect(within(listbox).queryByText('Espresso')).not.toBeInTheDocument();
    expect(within(listbox).getByText('Coffee')).toBeInTheDocument();
  });

  it('reaches a root Category beyond the first page through the parent-category search, not a fixed cap', async () => {
    const farRootRow = {
      id: 'category-far',
      name: 'Far Root',
      parent_id: null,
      is_active: true,
      display_order: 250,
      image_media_asset_id: null,
    };
    const getList = vi.fn(
      async (params: {
        resource: string;
        filters?: Array<{ field: string; operator: string; value?: unknown }>;
      }) => {
        const filters = params.filters ?? [];
        const isRootPicker = filters.some(
          (filter) => filter.field === 'parent_id' && filter.operator === 'null',
        );
        if (!isRootPicker) return { data: [rootRow], total: 1 };
        const searchFilter = filters.find(
          (filter) => filter.field === 'name' && filter.operator === 'contains',
        );
        if (searchFilter?.value === 'Far') return { data: [farRootRow], total: 1 };
        return { data: [rootRow], total: 1 };
      },
    );
    const create = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { id: 'category-2', ...(variables as object) },
    }));
    const dataProvider = createMockDataProvider({
      getList: getList as DataProvider['getList'],
      create: create as DataProvider['create'],
    });

    const user = userEvent.setup();
    renderCatalogTaxonomyPanel(dataProvider);

    await screen.findByText('Coffee');
    await user.click(screen.getByRole('button', { name: 'Add category' }));
    await user.type(screen.getByLabelText('Category name'), 'Espresso');

    const listbox = await screen.findByRole('listbox', { name: 'Parent category' });
    expect(within(listbox).queryByText('Far Root')).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Search parent categories'), 'Far');
    await user.click(await screen.findByRole('option', { name: 'Far Root' }));
    await user.click(screen.getByRole('button', { name: 'Save category' }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'categories',
          variables: expect.objectContaining({ parent_id: 'category-far' }),
        }),
      ),
    );
  });

  it('asks for confirmation before deactivating a Category, and proceeds on confirm', async () => {
    const getList = vi.fn(async () => ({ data: [rootRow], total: 1 }));
    const update = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { ...rootRow, ...(variables as object) },
    }));
    const dataProvider = createMockDataProvider({
      getList: getList as DataProvider['getList'],
      update: update as DataProvider['update'],
    });

    const user = userEvent.setup();
    renderCatalogTaxonomyPanel(dataProvider);

    await user.click(await screen.findByRole('button', { name: 'Deactivate Coffee' }));
    expect(update).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/may hide Products\/Variants that depend on it/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Deactivate' }));

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

  it('leaves the Category active and unmutated when the deactivate confirmation is cancelled', async () => {
    const getList = vi.fn(async () => ({ data: [rootRow], total: 1 }));
    const update = vi.fn();
    const dataProvider = createMockDataProvider({
      getList: getList as DataProvider['getList'],
      update: update as DataProvider['update'],
    });

    const user = userEvent.setup();
    renderCatalogTaxonomyPanel(dataProvider);

    await user.click(await screen.findByRole('button', { name: 'Deactivate Coffee' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(update).not.toHaveBeenCalled();
    expect(screen.getByText('Active')).toBeInTheDocument();
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
    renderCatalogTaxonomyPanel(dataProvider);

    await screen.findByText('Coffee');
    await user.click(screen.getByRole('button', { name: 'Move Coffee down' }));

    await waitFor(() =>
      expect(testContext.reorderCategories).toHaveBeenCalledWith(null, [
        'category-3',
        'category-1',
      ]),
    );
  });

  it('disables the move buttons for every row while a reorder is in flight', async () => {
    const getList = vi.fn(async () => ({ data: [rootRow, childRow], total: 2 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });
    let resolveReorder!: () => void;
    testContext.listCategories.mockResolvedValue([
      { id: 'category-1', name: 'Coffee', parentId: null, isActive: true, displayOrder: 0 },
      { id: 'category-3', name: 'Tea', parentId: null, isActive: true, displayOrder: 1 },
    ]);
    testContext.reorderCategories.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveReorder = resolve;
      }),
    );

    const user = userEvent.setup();
    renderCatalogTaxonomyPanel(dataProvider);

    await screen.findByText('Coffee');
    await user.click(screen.getByRole('button', { name: 'Move Coffee down' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Move Espresso up' })).toBeDisabled(),
    );

    resolveReorder();
  });
});
