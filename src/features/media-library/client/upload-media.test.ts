import { describe, expect, it, vi } from 'vitest';

import type { MediaAssetRecord } from '../types';
import {
  buildCloudinaryUploadFormData,
  executeMediaUpload,
  uploadFileToCloudinary,
} from './upload-media';

const signature = {
  timestamp: 1700000000,
  signature: 'signed-hash',
  apiKey: 'demo-key',
  cloudName: 'demo-cloud',
};

const registeredAsset: MediaAssetRecord = {
  id: 'media-2',
  publicId: 'kisok/new/asset',
  secureUrl: 'https://res.cloudinary.com/demo-cloud/image/upload/new',
  format: 'png',
  width: 200,
  height: 100,
  bytes: 4321,
  createdAt: '2026-08-26T00:00:00Z',
  updatedAt: '2026-08-26T00:00:00Z',
  assetId: 'cloudinary-asset-new',
  createdBy: 'admin-1',
};

function makeFile(): File {
  return new File(['binary-image-data'], 'photo.png', { type: 'image/png' });
}

describe('buildCloudinaryUploadFormData', () => {
  it('sends exactly the multipart fields Cloudinary needs for a signed upload', () => {
    const file = makeFile();
    const formData = buildCloudinaryUploadFormData(file, signature);

    expect(formData.get('file')).toBe(file);
    expect(formData.get('api_key')).toBe('demo-key');
    expect(formData.get('timestamp')).toBe('1700000000');
    expect(formData.get('signature')).toBe('signed-hash');
    expect(Array.from(formData.keys()).sort()).toEqual([
      'api_key',
      'file',
      'signature',
      'timestamp',
    ]);
  });
});

describe('uploadFileToCloudinary', () => {
  it('posts multipart form data to the cloud-scoped Cloudinary upload endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        public_id: 'kisok/new/asset',
        secure_url: 'https://res.cloudinary.com/demo-cloud/image/upload/new',
        asset_id: 'cloudinary-asset-new',
        width: 200,
        height: 100,
        format: 'png',
        bytes: 4321,
      }),
    });

    const result = await uploadFileToCloudinary(makeFile(), signature, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.cloudinary.com/v1_1/demo-cloud/image/upload',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    );
    expect(result).toEqual({
      publicId: 'kisok/new/asset',
      secureUrl: 'https://res.cloudinary.com/demo-cloud/image/upload/new',
      assetId: 'cloudinary-asset-new',
      width: 200,
      height: 100,
      format: 'png',
      bytes: 4321,
    });
  });

  it('surfaces a clear error and never fabricates a result when Cloudinary rejects the upload', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Invalid signature.' } }),
    });

    await expect(uploadFileToCloudinary(makeFile(), signature, fetchImpl)).rejects.toThrow(
      'Invalid signature.',
    );
  });
});

describe('executeMediaUpload', () => {
  it('only requests a signature and never touches Cloudinary or the registry when unauthenticated', async () => {
    const uploadToCloudinary = vi.fn();
    const registerMediaAsset = vi.fn();

    await expect(
      executeMediaUpload(makeFile(), {
        requestSignature: async () => {
          throw new Error('An active Admin session is required.');
        },
        uploadToCloudinary,
        registerMediaAsset,
        cleanupUploadedAsset: async () => undefined,
      }),
    ).rejects.toThrow('An active Admin session is required.');

    expect(uploadToCloudinary).not.toHaveBeenCalled();
    expect(registerMediaAsset).not.toHaveBeenCalled();
  });

  it('registers the uploaded asset with exactly the Cloudinary response fields on success', async () => {
    const registerMediaAsset = vi.fn().mockResolvedValue(registeredAsset);
    const cloudinaryResult = {
      publicId: 'kisok/new/asset',
      secureUrl: 'https://res.cloudinary.com/demo-cloud/image/upload/new',
      assetId: 'cloudinary-asset-new',
      width: 200,
      height: 100,
      format: 'png',
      bytes: 4321,
    };

    const result = await executeMediaUpload(makeFile(), {
      requestSignature: async () => signature,
      uploadToCloudinary: vi.fn().mockResolvedValue(cloudinaryResult),
      registerMediaAsset,
      cleanupUploadedAsset: async () => undefined,
    });

    expect(registerMediaAsset).toHaveBeenCalledWith(cloudinaryResult);
    expect(result).toBe(registeredAsset);
  });

  it('destroys the uploaded Cloudinary binary when metadata registration fails', async () => {
    const cloudinaryResult = {
      publicId: 'kisok/new/asset',
      secureUrl: 'https://res.cloudinary.com/demo-cloud/image/upload/new',
      assetId: 'cloudinary-asset-new',
      width: 200,
      height: 100,
      format: 'png',
      bytes: 4321,
    };
    const cleanupUploadedAsset = vi.fn().mockResolvedValue(undefined);

    await expect(
      executeMediaUpload(makeFile(), {
        requestSignature: async () => signature,
        uploadToCloudinary: vi.fn().mockResolvedValue(cloudinaryResult),
        registerMediaAsset: vi.fn().mockRejectedValue(new Error('metadata write failed')),
        cleanupUploadedAsset,
      }),
    ).rejects.toThrow('metadata write failed');

    expect(cleanupUploadedAsset).toHaveBeenCalledWith(cloudinaryResult);
  });

  it('does not insert a media_assets row when the Cloudinary upload fails', async () => {
    const registerMediaAsset = vi.fn();

    await expect(
      executeMediaUpload(makeFile(), {
        requestSignature: async () => signature,
        uploadToCloudinary: vi.fn().mockRejectedValue(new Error('Cloudinary upload failed.')),
        registerMediaAsset,
        cleanupUploadedAsset: async () => undefined,
      }),
    ).rejects.toThrow('Cloudinary upload failed.');

    expect(registerMediaAsset).not.toHaveBeenCalled();
  });
});
