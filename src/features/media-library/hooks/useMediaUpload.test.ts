import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  getMediaUploadSignature: vi.fn(),
  registerAsset: vi.fn(),
}));

vi.mock('../server/actions', () => ({
  getMediaUploadSignature: testContext.getMediaUploadSignature,
}));

vi.mock('../repositories', () => ({
  mediaLibraryRepository: { registerAsset: testContext.registerAsset },
}));

import { useMediaUpload } from './useMediaUpload';

const signature = { timestamp: 1700000000, signature: 'sig', apiKey: 'key', cloudName: 'demo' };
const file = new File(['data'], 'photo.png', { type: 'image/png' });

describe('useMediaUpload', () => {
  beforeEach(() => {
    testContext.getMediaUploadSignature.mockReset();
    testContext.registerAsset.mockReset();
  });

  it('uploads a file end to end and clears the busy flag on success', async () => {
    testContext.getMediaUploadSignature.mockResolvedValue(signature);
    testContext.registerAsset.mockResolvedValue({
      id: 'media-2',
      publicId: 'kisok/new',
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/new',
      format: 'png',
      width: 100,
      height: 100,
      bytes: 500,
      createdAt: '2026-08-26T00:00:00Z',
      updatedAt: '2026-08-26T00:00:00Z',
      assetId: 'asset-2',
      createdBy: 'admin-1',
    });

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        public_id: 'kisok/new',
        secure_url: 'https://res.cloudinary.com/demo/image/upload/new',
        asset_id: 'asset-2',
        width: 100,
        height: 100,
        format: 'png',
        bytes: 500,
      }),
    });
    vi.stubGlobal('fetch', fetchImpl);

    const { result } = renderHook(() => useMediaUpload());

    let uploaded: unknown;
    await act(async () => {
      uploaded = await result.current.upload(file);
    });

    expect(uploaded).toMatchObject({ id: 'media-2', publicId: 'kisok/new' });
    expect(testContext.registerAsset).toHaveBeenCalledWith({
      publicId: 'kisok/new',
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/new',
      assetId: 'asset-2',
      width: 100,
      height: 100,
      format: 'png',
      bytes: 500,
    });
    await waitFor(() => expect(result.current.uploading).toBe(false));
    expect(result.current.error).toBeNull();

    vi.unstubAllGlobals();
  });

  it('surfaces a readable error and returns null when the upload fails, without throwing', async () => {
    testContext.getMediaUploadSignature.mockRejectedValue(
      new Error('An active Admin session is required.'),
    );

    const { result } = renderHook(() => useMediaUpload());

    let uploaded: unknown = 'not-yet-set';
    await act(async () => {
      uploaded = await result.current.upload(file);
    });

    expect(uploaded).toBeNull();
    expect(result.current.error).toBe('An active Admin session is required.');
    expect(testContext.registerAsset).not.toHaveBeenCalled();
  });
});
