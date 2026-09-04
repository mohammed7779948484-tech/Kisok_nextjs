import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const acceptedImageTypes = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

vi.mock('../client/media-upload-validation', () => ({
  // Mirrors the real type check but skips the async dimension read, which
  // jsdom cannot perform for a synthetic in-memory File/Blob.
  validateMediaUploadFile: vi.fn(async (file: File) =>
    acceptedImageTypes.has(file.type)
      ? { valid: true }
      : { message: 'Choose a PNG, JPEG, WebP, GIF, or AVIF image.', valid: false },
  ),
}));

import { MediaPickerDialog } from './MediaPickerDialog';

const coverAsset = {
  assetId: 'cloudinary-1',
  bytes: 1200,
  createdAt: '2026-08-27T00:00:00Z',
  format: 'webp',
  height: 640,
  id: 'media-1',
  publicId: 'products/citrus-spark-cover',
  secureUrl: 'https://example.test/citrus-spark.webp',
  updatedAt: '2026-08-27T00:00:00Z',
  width: 640,
  createdBy: 'admin-1',
};

describe('MediaPickerDialog', () => {
  it('selects an existing visual Media Asset and confirms that selection', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MediaPickerDialog
          assets={[coverAsset]}
          onOpenChange={onOpenChange}
          onSelect={onSelect}
          open
          selectedAssetId={null}
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Select products/citrus-spark-cover' }));
    await user.click(screen.getByRole('button', { name: 'Use selected image' }));

    expect(onSelect).toHaveBeenCalledWith(coverAsset);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('rejects an unsupported upload before invoking the caller upload workflow', async () => {
    const upload = vi.fn();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MediaPickerDialog
          assets={[]}
          onOpenChange={vi.fn()}
          onSelect={vi.fn()}
          onUpload={upload}
          open
          selectedAssetId={null}
        />
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('Upload image'), {
      target: { files: [new File(['not-an-image'], 'cover.pdf', { type: 'application/pdf' })] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose a PNG, JPEG, WebP, GIF, or AVIF image.',
    );
    expect(upload).not.toHaveBeenCalled();
  });

  it('offers progressive camera capture when an upload workflow is available', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MediaPickerDialog
          assets={[]}
          onOpenChange={vi.fn()}
          onSelect={vi.fn()}
          onUpload={vi.fn()}
          open
          selectedAssetId={null}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByRole('button', { name: 'Take photo' })).toBeEnabled();
  });

  describe('camera capture failure retention', () => {
    const originalGetUserMedia = navigator.mediaDevices?.getUserMedia;

    afterEach(() => {
      vi.restoreAllMocks();
      if (originalGetUserMedia) {
        Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
          configurable: true,
          value: originalGetUserMedia,
        });
      }
    });

    it('keeps the captured photo preview and shows the error when the upload fails', async () => {
      const user = userEvent.setup();
      const fakeStream = { getTracks: () => [] } as unknown as MediaStream;
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: vi.fn().mockResolvedValue(fakeStream) },
      });
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D);
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
        callback(new Blob(['fake'], { type: 'image/jpeg' }));
      });

      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const failingUpload = vi.fn().mockResolvedValue(null);

      render(
        <QueryClientProvider client={queryClient}>
          <MediaPickerDialog
            assets={[]}
            onOpenChange={vi.fn()}
            onSelect={vi.fn()}
            onUpload={failingUpload}
            open
            selectedAssetId={null}
          />
        </QueryClientProvider>,
      );

      await user.click(screen.getByRole('button', { name: 'Take photo' }));
      await screen.findByLabelText('Camera preview');
      const video = screen.getByLabelText('Camera preview') as HTMLVideoElement;
      Object.defineProperty(video, 'videoWidth', { configurable: true, value: 640 });
      Object.defineProperty(video, 'videoHeight', { configurable: true, value: 480 });

      await user.click(screen.getByRole('button', { name: 'Capture photo' }));
      await screen.findByText('Use this photo?');

      await user.click(screen.getByRole('button', { name: 'Use photo' }));

      await waitFor(() => expect(failingUpload).toHaveBeenCalled());
      // The upload failed (returned null): the captured preview must remain so
      // the admin can retry, not silently disappear as if it never happened.
      expect(screen.getByText('Use this photo?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retake photo' })).toBeInTheDocument();
    });
  });
});
