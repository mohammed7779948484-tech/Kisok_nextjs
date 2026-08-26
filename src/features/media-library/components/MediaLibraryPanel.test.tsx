import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listAssets: vi.fn(),
  deleteMediaAsset: vi.fn(),
  registerAsset: vi.fn(),
  getMediaUploadSignature: vi.fn(),
}));

vi.mock('../repositories', () => ({
  mediaLibraryRepository: {
    listAssets: testContext.listAssets,
    registerAsset: testContext.registerAsset,
  },
}));
vi.mock('../server/actions', () => ({
  deleteMediaAsset: testContext.deleteMediaAsset,
  getMediaUploadSignature: testContext.getMediaUploadSignature,
}));

import { MediaLibraryPanel } from './MediaLibraryPanel';

describe('MediaLibraryPanel', () => {
  beforeEach(() => {
    testContext.listAssets.mockReset();
    testContext.deleteMediaAsset.mockReset();
    testContext.registerAsset.mockReset();
    testContext.getMediaUploadSignature.mockReset();
  });

  it('deletes an unused hosted Media Asset through the server action', async () => {
    const user = userEvent.setup();
    testContext.listAssets.mockResolvedValue([
      {
        id: 'media-1',
        publicId: 'kisok/test/asset',
        secureUrl: 'https://res.cloudinary.com/example/image/upload/test',
        format: 'webp',
        width: 640,
        height: 480,
        bytes: 1234,
        createdAt: '2026-08-26T00:00:00Z',
      },
    ]);
    testContext.deleteMediaAsset.mockResolvedValue(undefined);

    render(<MediaLibraryPanel />);
    await screen.findByText('kisok/test/asset');
    await user.click(screen.getByRole('button', { name: 'Delete kisok/test/asset' }));

    await waitFor(() => expect(testContext.deleteMediaAsset).toHaveBeenCalledWith('media-1'));
  });

  it('renders hosted media metadata instead of local role fixtures', async () => {
    testContext.listAssets.mockResolvedValue([
      {
        id: 'media-1',
        publicId: 'kisok/test/asset',
        secureUrl: 'https://res.cloudinary.com/example/image/upload/test',
        format: 'webp',
        width: 640,
        height: 480,
        bytes: 1234,
        createdAt: '2026-08-26T00:00:00Z',
      },
    ]);

    render(<MediaLibraryPanel />);

    expect(await screen.findByText('kisok/test/asset')).toBeInTheDocument();
    expect(screen.getByText('webp · 640×480')).toBeInTheDocument();
    expect(screen.queryByText(/local workspace/i)).not.toBeInTheDocument();
  });

  it('uploads a selected file through the signed Cloudinary flow and refreshes the register', async () => {
    const user = userEvent.setup();
    testContext.listAssets.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'media-2',
        publicId: 'kisok/new/asset',
        secureUrl: 'https://res.cloudinary.com/example/image/upload/new',
        format: 'png',
        width: 100,
        height: 100,
        bytes: 500,
        createdAt: '2026-08-26T00:00:00Z',
      },
    ]);
    testContext.getMediaUploadSignature.mockResolvedValue({
      timestamp: 1700000000,
      signature: 'sig',
      apiKey: 'demo-key',
      cloudName: 'demo-cloud',
    });
    testContext.registerAsset.mockResolvedValue({
      id: 'media-2',
      publicId: 'kisok/new/asset',
      secureUrl: 'https://res.cloudinary.com/example/image/upload/new',
      format: 'png',
      width: 100,
      height: 100,
      bytes: 500,
      createdAt: '2026-08-26T00:00:00Z',
    });
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        public_id: 'kisok/new/asset',
        secure_url: 'https://res.cloudinary.com/example/image/upload/new',
        asset_id: 'asset-2',
        width: 100,
        height: 100,
        format: 'png',
        bytes: 500,
      }),
    });
    vi.stubGlobal('fetch', fetchImpl);

    render(<MediaLibraryPanel />);
    await screen.findByText('No Media Assets are available.');

    const file = new File(['data'], 'photo.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Upload media'), file);

    await waitFor(() => expect(testContext.registerAsset).toHaveBeenCalled());
    expect(await screen.findByText('kisok/new/asset')).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it('shows a clear error and does not register a Media Asset when the Cloudinary upload fails', async () => {
    const user = userEvent.setup();
    testContext.listAssets.mockResolvedValue([]);
    testContext.getMediaUploadSignature.mockResolvedValue({
      timestamp: 1700000000,
      signature: 'sig',
      apiKey: 'demo-key',
      cloudName: 'demo-cloud',
    });
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Invalid signature.' } }),
    });
    vi.stubGlobal('fetch', fetchImpl);

    render(<MediaLibraryPanel />);
    await screen.findByText('No Media Assets are available.');

    const file = new File(['data'], 'photo.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Upload media'), file);

    expect(await screen.findByText('Invalid signature.')).toBeInTheDocument();
    expect(testContext.registerAsset).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
