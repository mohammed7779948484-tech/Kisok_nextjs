import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listAssets: vi.fn(),
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
  getMediaUploadSignature: testContext.getMediaUploadSignature,
}));

import { MediaAssetPickerDialog } from './MediaAssetPickerDialog';

describe('MediaAssetPickerDialog', () => {
  beforeEach(() => {
    testContext.listAssets.mockReset();
    testContext.registerAsset.mockReset();
    testContext.getMediaUploadSignature.mockReset();
  });

  it('renders a grid of media assets and allows searching', async () => {
    const user = userEvent.setup();
    testContext.listAssets.mockResolvedValue([
      {
        id: 'asset-1',
        publicId: 'brand/zyn-logo',
        secureUrl: 'https://res.cloudinary.com/example/image/upload/zyn.jpg',
        format: 'jpg',
        width: 300,
        height: 300,
      },
      {
        id: 'asset-2',
        publicId: 'brand/dozo-logo',
        secureUrl: 'https://res.cloudinary.com/example/image/upload/dozo.jpg',
        format: 'png',
        width: 400,
        height: 400,
      },
    ]);

    const onSelect = vi.fn();
    const onOpenChange = vi.fn();

    render(<MediaAssetPickerDialog onOpenChange={onOpenChange} onSelect={onSelect} open={true} />);

    expect(await screen.findByText('brand/zyn-logo')).toBeInTheDocument();
    expect(screen.getByText('brand/dozo-logo')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('Search media assets…');
    await user.type(searchInput, 'zyn');

    expect(screen.getByText('brand/zyn-logo')).toBeInTheDocument();
    expect(screen.queryByText('brand/dozo-logo')).not.toBeInTheDocument();
  });

  it('selects an asset and calls onSelect with the chosen asset', async () => {
    const user = userEvent.setup();
    const selectedAsset = {
      id: 'asset-1',
      publicId: 'brand/zyn-logo',
      secureUrl: 'https://res.cloudinary.com/example/image/upload/zyn.jpg',
      format: 'jpg',
      width: 300,
      height: 300,
    };
    testContext.listAssets.mockResolvedValue([selectedAsset]);

    const onSelect = vi.fn();
    const onOpenChange = vi.fn();

    render(<MediaAssetPickerDialog onOpenChange={onOpenChange} onSelect={onSelect} open={true} />);

    await screen.findByText('brand/zyn-logo');
    await user.click(screen.getByRole('button', { name: 'Select brand/zyn-logo' }));

    expect(onSelect).toHaveBeenCalledWith(selectedAsset);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('uploads a file from the picker and allows selecting the new asset', async () => {
    const user = userEvent.setup();
    const newAsset = {
      id: 'asset-uploaded',
      publicId: 'brand/new-logo',
      secureUrl: 'https://res.cloudinary.com/example/image/upload/new.png',
      format: 'png',
      width: 200,
      height: 200,
    };

    testContext.listAssets.mockResolvedValueOnce([]).mockResolvedValueOnce([newAsset]);
    testContext.getMediaUploadSignature.mockResolvedValue({
      timestamp: 1700000000,
      signature: 'sig',
      apiKey: 'demo-key',
      cloudName: 'demo-cloud',
    });
    testContext.registerAsset.mockResolvedValue(newAsset);

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        public_id: 'brand/new-logo',
        secure_url: 'https://res.cloudinary.com/example/image/upload/new.png',
        asset_id: 'asset-cloud-id',
        width: 200,
        height: 200,
        format: 'png',
        bytes: 1200,
      }),
    });
    vi.stubGlobal('fetch', fetchImpl);

    const onSelect = vi.fn();
    const onOpenChange = vi.fn();

    render(<MediaAssetPickerDialog onOpenChange={onOpenChange} onSelect={onSelect} open={true} />);

    await screen.findByText('No media assets available. Upload one to get started.');

    const file = new File(['image-bytes'], 'brand-logo.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Upload media asset'), file);

    await waitFor(() => expect(testContext.registerAsset).toHaveBeenCalled());
    expect(await screen.findByText('brand/new-logo')).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
