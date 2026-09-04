import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  getAsset: vi.fn(),
  listAssetsPage: vi.fn(),
}));

vi.mock('../repositories', () => ({
  storeSettingsRepository: {
    get: testContext.get,
    update: testContext.update,
  },
}));

vi.mock('@/features/media-library/repositories', () => ({
  mediaLibraryRepository: {
    getAsset: testContext.getAsset,
    listAssetsPage: testContext.listAssetsPage,
  },
}));

import { StoreSettingsPanel } from './StoreSettingsPanel';

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <StoreSettingsPanel />
    </QueryClientProvider>,
  );
}

const baseSettings = {
  id: true,
  storeName: 'KISOK Hosted',
  globalLowStockThreshold: 8,
  customerSuccessResetSeconds: 90,
  storeTimezone: 'UTC',
  logoMediaAssetId: null,
};

const libraryAsset = {
  id: 'media-1',
  publicId: 'kiosk/logo',
  secureUrl: 'https://res.cloudinary.com/example/image/upload/logo',
  format: 'webp',
  width: 300,
  height: 100,
  bytes: 1234,
  createdAt: '2026-08-26T00:00:00Z',
  updatedAt: '2026-08-26T00:00:00Z',
  assetId: 'cloudinary-1',
  createdBy: 'admin-1',
};

describe('StoreSettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testContext.getAsset.mockResolvedValue(null);
    testContext.listAssetsPage.mockResolvedValue({ assets: [libraryAsset], total: 1 });
  });

  it('persists a logo Media Asset selected through the shared Media Picker', async () => {
    const user = userEvent.setup();
    testContext.get.mockResolvedValue(baseSettings);
    testContext.update.mockResolvedValue({ ...baseSettings, logoMediaAssetId: 'media-1' });

    renderPanel();
    await screen.findByText('KISOK Hosted');
    await user.click(screen.getByRole('button', { name: 'Edit settings' }));
    await user.click(screen.getByRole('button', { name: 'Choose from library' }));

    await screen.findByText('Select Store Logo');
    await user.click(await screen.findByRole('button', { name: /Select kiosk\/logo/i }));
    await user.click(screen.getByRole('button', { name: 'Use selected image' }));
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() =>
      expect(testContext.update).toHaveBeenCalledWith(
        expect.objectContaining({ logoMediaAssetId: 'media-1' }),
      ),
    );
  });

  it('rejects a zero customer-success reset duration before attempting persistence', async () => {
    const user = userEvent.setup();
    testContext.get.mockResolvedValue(baseSettings);

    renderPanel();
    await screen.findByText('KISOK Hosted');
    await user.click(screen.getByRole('button', { name: 'Edit settings' }));
    await user.clear(screen.getByLabelText('Customer success reset seconds'));
    await user.type(screen.getByLabelText('Customer success reset seconds'), '0');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    expect(await screen.findByText(/at least 1 second/i)).toBeInTheDocument();
    expect(testContext.update).not.toHaveBeenCalled();
  });

  it('rejects a non-IANA timezone before attempting persistence', async () => {
    const user = userEvent.setup();
    testContext.get.mockResolvedValue(baseSettings);

    renderPanel();
    await screen.findByText('KISOK Hosted');
    await user.click(screen.getByRole('button', { name: 'Edit settings' }));
    await user.clear(screen.getByLabelText('Timezone'));
    await user.type(screen.getByLabelText('Timezone'), 'not-a-timezone');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    expect(await screen.findByText(/valid IANA timezone/i)).toBeInTheDocument();
    expect(testContext.update).not.toHaveBeenCalled();
  });

  it('does not make an unverified static connection claim', async () => {
    testContext.get.mockResolvedValue(baseSettings);

    renderPanel();
    await screen.findByText('KISOK Hosted');

    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
    expect(screen.getByText(/verified when you refresh/i)).toBeInTheDocument();
  });

  it('renders persisted hosted Store Settings rather than local placeholders', async () => {
    testContext.get.mockResolvedValue(baseSettings);

    renderPanel();

    expect(await screen.findByText('KISOK Hosted')).toBeInTheDocument();
    expect(screen.getByText('Supabase-backed')).toBeInTheDocument();
    expect(screen.queryByText(/local workspace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/will persist once/i)).not.toBeInTheDocument();
  });
});
