import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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
});
