import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listAssets: vi.fn(),
  listVariantMedia: vi.fn(),
  attachVariantMedia: vi.fn(),
  detachVariantMedia: vi.fn(),
  setPrimaryVariantMedia: vi.fn(),
  reorderVariantMedia: vi.fn(),
}));

vi.mock('../repositories', () => ({
  mediaLibraryRepository: {
    listAssets: testContext.listAssets,
    listVariantMedia: testContext.listVariantMedia,
    attachVariantMedia: testContext.attachVariantMedia,
    detachVariantMedia: testContext.detachVariantMedia,
    setPrimaryVariantMedia: testContext.setPrimaryVariantMedia,
    reorderVariantMedia: testContext.reorderVariantMedia,
  },
}));

import { VariantMediaPicker } from './VariantMediaPicker';

const attachedAsset = {
  variantId: 'variant-1',
  mediaAssetId: 'media-1',
  displayOrder: 10,
  isPrimary: true,
  createdAt: '2026-08-26T00:00:00Z',
  asset: {
    publicId: 'kisok/attached/asset',
    secureUrl: 'https://res.cloudinary.com/example/image/upload/attached',
    width: 640,
    height: 480,
    format: 'webp',
  },
};

const libraryAsset = {
  id: 'media-2',
  publicId: 'kisok/library/asset',
  secureUrl: 'https://res.cloudinary.com/example/image/upload/library',
  format: 'png',
  width: 300,
  height: 300,
  bytes: 900,
  createdAt: '2026-08-26T00:00:00Z',
  updatedAt: '2026-08-26T00:00:00Z',
  assetId: 'asset-2',
  createdBy: 'admin-1',
};

describe('VariantMediaPicker', () => {
  beforeEach(() => {
    testContext.listAssets.mockReset();
    testContext.listVariantMedia.mockReset();
    testContext.attachVariantMedia.mockReset();
    testContext.detachVariantMedia.mockReset();
    testContext.setPrimaryVariantMedia.mockReset();
    testContext.reorderVariantMedia.mockReset();
  });

  it('lists currently attached Media and available library items to attach', async () => {
    testContext.listVariantMedia.mockResolvedValue([attachedAsset]);
    testContext.listAssets.mockResolvedValue([libraryAsset]);

    render(<VariantMediaPicker variantId="variant-1" />);

    expect(await screen.findByText('kisok/attached/asset')).toBeInTheDocument();
    expect(screen.getByText('kisok/library/asset')).toBeInTheDocument();
    expect(testContext.listVariantMedia).toHaveBeenCalledWith('variant-1');
  });

  it('never exposes a "Delete" action for attached Media — only "Remove from Variant"', async () => {
    testContext.listVariantMedia.mockResolvedValue([attachedAsset]);
    testContext.listAssets.mockResolvedValue([]);

    render(<VariantMediaPicker variantId="variant-1" />);

    await screen.findByText('kisok/attached/asset');
    expect(screen.getByRole('button', { name: /remove from variant/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^delete/i })).not.toBeInTheDocument();
  });

  it('attaches an available Media Asset to the Variant', async () => {
    const user = userEvent.setup();
    testContext.listVariantMedia
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { ...attachedAsset, mediaAssetId: 'media-2', asset: { ...libraryAsset } },
      ]);
    testContext.listAssets.mockResolvedValue([libraryAsset]);
    testContext.attachVariantMedia.mockResolvedValue(undefined);

    render(<VariantMediaPicker variantId="variant-1" />);

    await screen.findByText('kisok/library/asset');
    await user.click(screen.getByRole('button', { name: 'Attach to Variant' }));

    await waitFor(() =>
      expect(testContext.attachVariantMedia).toHaveBeenCalledWith('variant-1', 'media-2'),
    );
  });

  it('detaches only the join row via detachVariantMedia, never a delete', async () => {
    const user = userEvent.setup();
    testContext.listVariantMedia.mockResolvedValueOnce([attachedAsset]).mockResolvedValueOnce([]);
    testContext.listAssets.mockResolvedValue([]);
    testContext.detachVariantMedia.mockResolvedValue(undefined);

    render(<VariantMediaPicker variantId="variant-1" />);

    await screen.findByText('kisok/attached/asset');
    await user.click(screen.getByRole('button', { name: /remove from variant/i }));

    await waitFor(() =>
      expect(testContext.detachVariantMedia).toHaveBeenCalledWith('variant-1', 'media-1'),
    );
  });

  it('marks a Media Asset as primary', async () => {
    const user = userEvent.setup();
    const secondAttached = {
      ...attachedAsset,
      mediaAssetId: 'media-3',
      isPrimary: false,
      asset: { ...attachedAsset.asset, publicId: 'kisok/second/asset' },
    };
    testContext.listVariantMedia.mockResolvedValue([attachedAsset, secondAttached]);
    testContext.listAssets.mockResolvedValue([]);
    testContext.setPrimaryVariantMedia.mockResolvedValue(undefined);

    render(<VariantMediaPicker variantId="variant-1" />);

    await screen.findByText('kisok/second/asset');
    await user.click(screen.getAllByRole('button', { name: /make primary/i })[0]);

    await waitFor(() =>
      expect(testContext.setPrimaryVariantMedia).toHaveBeenCalledWith('variant-1', 'media-3'),
    );
  });
});
