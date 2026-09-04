import { describe, expect, it, vi } from 'vitest';

import { executeMediaAssetDelete } from './delete-media';

const asset = {
  id: 'media-1',
  publicId: 'kiosk/test/asset',
  secureUrl: 'https://res.cloudinary.com/example/image/upload/test',
  format: 'webp',
  width: 640,
  height: 480,
  bytes: 1234,
  createdAt: '2026-08-26T00:00:00Z',
  updatedAt: '2026-08-26T00:00:00Z',
  assetId: 'kisok-cloudinary-asset-1',
  createdBy: 'profile-1',
};

describe('Media Asset deletion boundary', () => {
  it('blocks deletion when the hosted usage guard reports references', async () => {
    const deleteCloudinary = vi.fn();
    const deleteMetadata = vi.fn();

    await expect(
      executeMediaAssetDelete('media-1', {
        getAsset: async () => asset,
        getUsage: async () => ({
          brands: 1,
          categories: 0,
          product_covers: 0,
          variant_media: 0,
          order_items_historical: 0,
        }),
        deleteMetadata,
        restoreMetadata: vi.fn(),
        deleteCloudinary,
      }),
    ).rejects.toThrow('Media Asset is still in use.');
    expect(deleteMetadata).not.toHaveBeenCalled();
    expect(deleteCloudinary).not.toHaveBeenCalled();
  });

  it('restores metadata if Cloudinary deletion fails after metadata removal', async () => {
    const restoreMetadata = vi.fn().mockResolvedValue(undefined);

    await expect(
      executeMediaAssetDelete('media-1', {
        getAsset: async () => asset,
        getUsage: async () => ({
          brands: 0,
          categories: 0,
          product_covers: 0,
          variant_media: 0,
          order_items_historical: 0,
        }),
        deleteMetadata: vi.fn().mockResolvedValue(undefined),
        restoreMetadata,
        deleteCloudinary: vi.fn().mockRejectedValue(new Error('Cloudinary unavailable')),
      }),
    ).rejects.toThrow('Cloudinary unavailable');
    expect(restoreMetadata).toHaveBeenCalledWith(asset);
  });

  it('surfaces a combined error, not a silent single-sided one, when restoration also fails', async () => {
    // Worst case: DB metadata is deleted, Cloudinary deletion fails, and the
    // restore-on-failure write ALSO fails. The Cloudinary asset survives but
    // its Supabase metadata row is now gone — that context must never be
    // lost behind whatever generic error the failed restore happens to throw.
    const rejection = executeMediaAssetDelete('media-1', {
      getAsset: async () => asset,
      getUsage: async () => ({
        brands: 0,
        categories: 0,
        product_covers: 0,
        variant_media: 0,
        order_items_historical: 0,
      }),
      deleteMetadata: vi.fn().mockResolvedValue(undefined),
      restoreMetadata: vi.fn().mockRejectedValue(new Error('restore insert violates constraint')),
      deleteCloudinary: vi.fn().mockRejectedValue(new Error('Cloudinary unavailable')),
    });

    await expect(rejection).rejects.toThrow(/Cloudinary unavailable/);
    await expect(rejection).rejects.toThrow(/restore insert violates constraint/);
    await expect(rejection).rejects.toThrow(/manual reconciliation/i);
  });
});
