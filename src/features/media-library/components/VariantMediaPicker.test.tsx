import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listAssets: vi.fn(),
  listAssetsPage: vi.fn(),
  listVariantMedia: vi.fn(),
  attachVariantMedia: vi.fn(),
  detachVariantMedia: vi.fn(),
  setPrimaryVariantMedia: vi.fn(),
  reorderVariantMedia: vi.fn(),
}));

vi.mock('../repositories', () => ({
  mediaLibraryRepository: {
    listAssets: testContext.listAssets,
    listAssetsPage: testContext.listAssetsPage,
    listVariantMedia: testContext.listVariantMedia,
    attachVariantMedia: testContext.attachVariantMedia,
    detachVariantMedia: testContext.detachVariantMedia,
    setPrimaryVariantMedia: testContext.setPrimaryVariantMedia,
    reorderVariantMedia: testContext.reorderVariantMedia,
  },
}));

import { VariantMediaPicker } from './VariantMediaPicker';

function renderPicker() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <VariantMediaPicker variantId="variant-1" />
    </QueryClientProvider>,
  );
}

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
    testContext.listAssetsPage.mockReset();
    testContext.listVariantMedia.mockReset();
    testContext.attachVariantMedia.mockReset();
    testContext.detachVariantMedia.mockReset();
    testContext.setPrimaryVariantMedia.mockReset();
    testContext.reorderVariantMedia.mockReset();
  });

  it('lists currently attached Media and provides explicit shared-picker entry without eager library loading', async () => {
    testContext.listVariantMedia.mockResolvedValue([attachedAsset]);

    renderPicker();

    expect(await screen.findByText('kisok/attached/asset')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Media' })).toBeInTheDocument();
    expect(testContext.listAssets).not.toHaveBeenCalled();
    expect(testContext.listVariantMedia).toHaveBeenCalledWith('variant-1');
  });

  it('opens a shared bounded Media picker only when the operator chooses Add Media', async () => {
    testContext.listVariantMedia.mockResolvedValue([]);
    testContext.listAssets.mockRejectedValue(new Error('Unbounded Media fetch must not run.'));

    renderPicker();

    expect(await screen.findByRole('button', { name: 'Add Media' })).toBeEnabled();
    expect(testContext.listAssets).not.toHaveBeenCalled();
  });

  it('never exposes a "Delete" action for attached Media — only "Remove from Variant"', async () => {
    testContext.listVariantMedia.mockResolvedValue([attachedAsset]);
    testContext.listAssets.mockResolvedValue([]);

    renderPicker();

    await screen.findByText('kisok/attached/asset');
    expect(screen.getByRole('button', { name: /remove from variant/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^delete/i })).not.toBeInTheDocument();
  });

  it('attaches a Media Asset selected through the shared bounded picker', async () => {
    const user = userEvent.setup();
    testContext.listVariantMedia
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { ...attachedAsset, mediaAssetId: 'media-2', asset: { ...libraryAsset } },
      ]);
    testContext.listAssetsPage.mockResolvedValue({ assets: [libraryAsset], total: 1 });
    testContext.attachVariantMedia.mockResolvedValue(undefined);

    renderPicker();

    await user.click(await screen.findByRole('button', { name: 'Add Media' }));
    await user.click(await screen.findByRole('button', { name: 'Select kisok/library/asset' }));
    await user.click(screen.getByRole('button', { name: 'Use selected image' }));

    await waitFor(() =>
      expect(testContext.attachVariantMedia).toHaveBeenCalledWith('variant-1', 'media-2'),
    );
  });

  it('detaches only the join row via detachVariantMedia, never a delete', async () => {
    const user = userEvent.setup();
    testContext.listVariantMedia.mockResolvedValueOnce([attachedAsset]).mockResolvedValueOnce([]);
    testContext.listAssets.mockResolvedValue([]);
    testContext.detachVariantMedia.mockResolvedValue(undefined);

    renderPicker();

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

    renderPicker();

    await screen.findByText('kisok/second/asset');
    await user.click(screen.getAllByRole('button', { name: /make primary/i })[0]);

    await waitFor(() =>
      expect(testContext.setPrimaryVariantMedia).toHaveBeenCalledWith('variant-1', 'media-3'),
    );
  });
});
