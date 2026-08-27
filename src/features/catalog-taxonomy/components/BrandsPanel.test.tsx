import type { DataProvider } from '@refinedev/core';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mediaTestContext = vi.hoisted(() => ({
  listAssets: vi.fn(),
  registerAsset: vi.fn(),
  getMediaUploadSignature: vi.fn(),
}));

vi.mock('../../media-library/repositories', () => ({
  mediaLibraryRepository: {
    listAssets: mediaTestContext.listAssets,
    registerAsset: mediaTestContext.registerAsset,
  },
}));

vi.mock('../../media-library/server/actions', () => ({
  getMediaUploadSignature: mediaTestContext.getMediaUploadSignature,
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

describe('BrandsPanel', () => {
  beforeEach(() => {
    mediaTestContext.listAssets.mockReset();
    mediaTestContext.registerAsset.mockReset();
    mediaTestContext.getMediaUploadSignature.mockReset();
  });

  it('renders hosted Brand records through Refine list state with logo image', async () => {
    const getList = vi.fn(async () => ({ data: [brandRow], total: 1 }));
    const dataProvider = createMockDataProvider({ getList: getList as DataProvider['getList'] });

    renderWithRefine(<BrandsPanel />, dataProvider, ['brands']);

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

    renderWithRefine(<BrandsPanel />, dataProvider, ['brands']);
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

  it('creates a Brand through the shared Refine data provider and allows selecting a logo', async () => {
    mediaTestContext.listAssets.mockResolvedValue([
      {
        id: 'asset-2',
        publicId: 'brand/field-notes-logo',
        secureUrl: 'https://res.cloudinary.com/example/image/upload/field-notes.jpg',
        format: 'jpg',
        width: 300,
        height: 300,
      },
    ]);

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
    renderWithRefine(<BrandsPanel />, dataProvider, ['brands']);

    await user.click(await screen.findByRole('button', { name: 'Add brand' }));
    await user.type(screen.getByLabelText('Brand name'), 'Field Notes');

    // Open media picker and select image
    await user.click(screen.getByRole('button', { name: 'Choose from library' }));
    await screen.findByText('brand/field-notes-logo');
    await user.click(screen.getByRole('button', { name: 'Select brand/field-notes-logo' }));

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

  it('toggles a Brand active state without opening the edit form', async () => {
    const getList = vi.fn(async () => ({ data: [brandRow], total: 1 }));
    const update = vi.fn(async ({ variables }: { variables: unknown }) => ({
      data: { ...brandRow, ...(variables as object) },
    }));
    const dataProvider = createMockDataProvider({
      getList: getList as DataProvider['getList'],
      update: update as DataProvider['update'],
    });

    const user = userEvent.setup();
    renderWithRefine(<BrandsPanel />, dataProvider, ['brands']);

    await user.click(await screen.findByRole('button', { name: 'Deactivate Northline' }));

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
});
