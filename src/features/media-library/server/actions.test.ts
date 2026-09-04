import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  executeMediaAssetDelete: vi.fn(),
  getTrustedAdminSession: vi.fn(),
}));

vi.mock('./delete-media', () => ({
  executeMediaAssetDelete: testContext.executeMediaAssetDelete,
}));

vi.mock('@/infrastructure/supabase/auth/server', () => ({
  getTrustedAdminSession: testContext.getTrustedAdminSession,
}));

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.test',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
  },
}));

import { deleteMediaAsset, getMediaUploadSignature } from './actions';

describe('Media Library server action', () => {
  it('delegates deletion to the server-only usage and Cloudinary operation', async () => {
    testContext.getTrustedAdminSession.mockResolvedValue({ userId: 'admin-1' });
    testContext.executeMediaAssetDelete.mockResolvedValue(undefined);

    await expect(deleteMediaAsset('media-1')).resolves.toBeUndefined();
    expect(testContext.executeMediaAssetDelete).toHaveBeenCalledWith(
      'media-1',
      expect.objectContaining({
        getAsset: expect.any(Function),
        getUsage: expect.any(Function),
        deleteMetadata: expect.any(Function),
        restoreMetadata: expect.any(Function),
        deleteCloudinary: expect.any(Function),
      }),
    );
  });

  it('refuses to sign an upload when Cloudinary server configuration is unavailable, instead of faking success', async () => {
    testContext.getTrustedAdminSession.mockResolvedValue({ userId: 'admin-1' });

    await expect(getMediaUploadSignature()).rejects.toThrow(
      'Cloudinary server configuration is unavailable.',
    );
  });
});
