import type { ReactElement } from 'react';

import type { DataProvider } from '@refinedev/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mediaTestContext = vi.hoisted(() => ({
  listAssetsPage: vi.fn(),
  registerAsset: vi.fn(),
  getMediaUploadSignature: vi.fn(),
}));

const reorderTestContext = vi.hoisted(() => ({
  listBrands: vi.fn(),
  reorderBrands: vi.fn(),
}));

vi.mock('../../media-library/repositories', () => ({
  mediaLibraryRepository: {
    listAssetsPage: mediaTestContext.listAssetsPage,
    registerAsset: mediaTestContext.registerAsset,
  },
}));

vi.mock('../../media-library/server/actions', () => ({
  getMediaUploadSignature: mediaTestContext.getMediaUploadSignature,
}));

vi.mock('../repositories', () => ({
  catalogTaxonomyRepository: {
    listBrands: reorderTestContext.listBrands,
    reorderBrands: reorderTestContext.reorderBrands,
  },
}));

import { createMockDataProvider, renderWithRefine } from '../../../../test/refine-test-utils';
import { BrandsPanel } from './BrandsPanel';

const brandRow = {
  id: 'brand-1',
  name: 'Northline',
  is_active: true,
  display_order: 0,
  image_media_asset_id: 'asset-1',
  media_assets: {
    id: 'asset-1',
    public_id: 'brand/northline-logo',
    secure_url: 'https://res.cloudinary.com/example/image/upload/northline.jpg',
  },
};

function renderBrandsPanel(dataProvider: DataProvider) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithRefine(
    (
      <QueryClientProvider client={queryClient}>
        <BrandsPanel />
      </QueryClientProvider>
    ) as ReactElement,
    dataProvider,
    ['brands'],
  );
}

describe('BrandsPanel', () => {
  beforeEach(() => {
    mediaTestContext.listAssetsPage.mockReset();
    mediaTestContext.registerAsset.mockReset();
    mediaTestContext.getMediaUploadSignature.mockReset();
    mediaTestContext.listAssetsPage.mockResolvedValue({ assets: [], total: 0 });
    reorderTestContext.listBrands.mockReset();
    reorderTestContext.reorderBrands.mockReset();
  });

  it('renders hosted Brand records through Refine list state with logo image', async () => {
    const getList = vi.fn(async () => ({ data: [brandRow], total: 1 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    renderBrandsPanel(dataProvider);

    expect(await screen.findByText('Northline')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();

    const logoImg = screen.getByRole('img', { name: 'Northline' });
    expect(logoImg).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/example/image/upload/northline.jpg',
    );
  });

  it('debounces search input into a single contains-filtered list request', async () => {
    const user = userEvent.setup();
    const getList = vi.fn(async (_params: unknown) => ({ data: [], total: 0 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    renderBrandsPanel(dataProvider);
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(1));

    await user.type(screen.getByPlaceholderText('Search brands'), 'nor');

    await waitFor(
      () => {
        expect(getList).toHaveBeenCalledTimes(2);
        const lastCall = getList.mock.calls.at(-1)?.[0] as { filters?: unknown } | undefined;
        expect(lastCall?.filters).toEqual([{ field: 'name', operator: 'contains', value: 'nor' }]);
      },
      { timeout: 2000 },
    );
  });

  it('creates a Brand through the shared Refine data provider using the canonical Media Picker', async () => {
    mediaTestContext.listAssetsPage.mockResolvedValue({
      assets: [
        {
          id: 'asset-2',
          publicId: 'brand/field-notes-logo',
          secureUrl: 'https://res.cloudinary.com/example/image/upload/field-notes.jpg',
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
      .mockResolvedValueOnce({ data: [brandRow], total: 1 });
    const create = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { id: 'brand-1', ...(variables as object) },
    }));
    const dataProvider = createMockDataProvider({
      getList: getList as DataProvider['getList'],
      create: create as DataProvider['create'],
    });

    const user = userEvent.setup();
    renderBrandsPanel(dataProvider);

    await user.click(await screen.findByRole('button', { name: 'Add brand' }));
    await user.type(screen.getByLabelText('Brand name'), 'Field Notes');

    // Open the canonical Media Picker dialog (server-paginated, search + upload capable).
    await user.click(screen.getByRole('button', { name: 'Choose from library' }));
    expect(await screen.findByText('Select Brand Logo')).toBeInTheDocument();
    await screen.findByText('brand/field-notes-logo');
    await user.click(screen.getByRole('button', { name: 'Select brand/field-notes-logo' }));
    await user.click(screen.getByRole('button', { name: 'Use selected image' }));

    await user.click(screen.getByRole('button', { name: 'Save brand' }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'brands',
          variables: {
            name: 'Field Notes',
            is_active: true,
            image_media_asset_id: 'asset-2',
          },
        }),
      ),
    );
  });

  it('asks for confirmation before deactivating a Brand, and proceeds on confirm', async () => {
    const getList = vi.fn(async () => ({ data: [brandRow], total: 1 }));
    const update = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { ...brandRow, ...(variables as object) },
    }));
    const dataProvider = createMockDataProvider({
      getList: getList as DataProvider['getList'],
      update: update as DataProvider['update'],
    });

    const user = userEvent.setup();
    renderBrandsPanel(dataProvider);

    await user.click(await screen.findByRole('button', { name: 'Deactivate Northline' }));
    expect(update).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/may hide Products\/Variants that depend on it/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Deactivate' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'brands',
          id: 'brand-1',
          variables: { is_active: false },
        }),
      ),
    );
  });

  it('leaves the Brand active and unmutated when the deactivate confirmation is cancelled', async () => {
    const getList = vi.fn(async () => ({ data: [brandRow], total: 1 }));
    const update = vi.fn();
    const dataProvider = createMockDataProvider({
      getList: getList as DataProvider['getList'],
      update: update as DataProvider['update'],
    });

    const user = userEvent.setup();
    renderBrandsPanel(dataProvider);

    await user.click(await screen.findByRole('button', { name: 'Deactivate Northline' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(update).not.toHaveBeenCalled();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('reorders a Brand by calling the reorder_items RPC through the repository', async () => {
    const secondBrandRow = {
      id: 'brand-2',
      name: 'Southline',
      is_active: true,
      display_order: 1,
      image_media_asset_id: null,
    };
    const getList = vi.fn(async () => ({ data: [brandRow, secondBrandRow], total: 2 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });
    reorderTestContext.listBrands.mockResolvedValue([
      { id: 'brand-1', name: 'Northline', isActive: true, displayOrder: 0 },
      { id: 'brand-2', name: 'Southline', isActive: true, displayOrder: 1 },
    ]);
    reorderTestContext.reorderBrands.mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderBrandsPanel(dataProvider);

    await screen.findByText('Northline');
    await user.click(screen.getByRole('button', { name: 'Move Northline down' }));

    await waitFor(() =>
      expect(reorderTestContext.reorderBrands).toHaveBeenCalledWith(['brand-2', 'brand-1']),
    );
  });

  it('disables the move-up button on the first row and the move-down button on the last row', async () => {
    const secondBrandRow = {
      id: 'brand-2',
      name: 'Southline',
      is_active: true,
      display_order: 1,
      image_media_asset_id: null,
    };
    const getList = vi.fn(async () => ({ data: [brandRow, secondBrandRow], total: 2 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    renderBrandsPanel(dataProvider);

    await screen.findByText('Northline');
    expect(screen.getByRole('button', { name: 'Move Northline up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Northline down' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Move Southline up' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Move Southline down' })).toBeDisabled();
  });

  it('disables both move buttons on every row while a reorder is in flight', async () => {
    const secondBrandRow = {
      id: 'brand-2',
      name: 'Southline',
      is_active: true,
      display_order: 1,
      image_media_asset_id: null,
    };
    const getList = vi.fn(async () => ({ data: [brandRow, secondBrandRow], total: 2 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });
    let resolveReorder!: () => void;
    reorderTestContext.listBrands.mockResolvedValue([
      { id: 'brand-1', name: 'Northline', isActive: true, displayOrder: 0 },
      { id: 'brand-2', name: 'Southline', isActive: true, displayOrder: 1 },
    ]);
    reorderTestContext.reorderBrands.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveReorder = resolve;
      }),
    );

    const user = userEvent.setup();
    renderBrandsPanel(dataProvider);

    await screen.findByText('Northline');
    await user.click(screen.getByRole('button', { name: 'Move Northline down' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Move Southline up' })).toBeDisabled(),
    );

    resolveReorder();
  });
});
