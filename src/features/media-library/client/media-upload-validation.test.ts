import { describe, expect, it } from 'vitest';

import { validateMediaUploadFile } from './media-upload-validation';

describe('validateMediaUploadFile', () => {
  it('rejects a non-image MIME type before any signing or upload request', async () => {
    const file = new File(['not-an-image'], 'cover.pdf', { type: 'application/pdf' });

    await expect(validateMediaUploadFile(file)).resolves.toEqual({
      message: 'Choose a PNG, JPEG, WebP, GIF, or AVIF image.',
      valid: false,
    });
  });

  it('rejects an image whose decoded dimensions exceed the supported bound', async () => {
    const file = new File(['image'], 'cover.webp', { type: 'image/webp' });

    await expect(
      validateMediaUploadFile(file, async () => ({ height: 1200, width: 5001 })),
    ).resolves.toEqual({
      message: 'Image dimensions must not exceed 5000 × 5000 pixels.',
      valid: false,
    });
  });
});
