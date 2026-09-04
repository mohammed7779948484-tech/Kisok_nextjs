import { describe, expect, it } from 'vitest';

import { createCloudinaryUploadSignature } from './cloudinary';

describe('Cloudinary server boundary', () => {
  it('creates a deterministic SHA signature from sorted upload parameters', () => {
    expect(
      createCloudinaryUploadSignature(
        { folder: 'kiosk', public_id: 'asset-1', timestamp: 1700000000 },
        'test-secret',
      ),
    ).toBe('4b3106ec5f638c3e9cb29d1bc65e7c082ad9e17e');
  });

  it('rejects missing server configuration instead of falling back to unsigned uploads', () => {
    expect(() => createCloudinaryUploadSignature({ timestamp: 1700000000 }, '')).toThrow(
      'Cloudinary API secret is required on the server.',
    );
  });
});
