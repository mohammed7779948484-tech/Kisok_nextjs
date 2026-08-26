import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  listAssets: vi.fn(),
}));

vi.mock('../repositories', () => ({
  storeSettingsRepository: {
    get: testContext.get,
    update: testContext.update,
  },
}));

vi.mock('@/features/media-library/repositories', () => ({
  mediaLibraryRepository: { listAssets: testContext.listAssets },
}));

import { StoreSettingsPanel } from './StoreSettingsPanel';

describe('StoreSettingsPanel', () => {
  it('persists a selected hosted logo Media Asset', async () => {
    const user = userEvent.setup();
    testContext.get.mockResolvedValue({
      id: true,
      storeName: 'KISOK Hosted',
      globalLowStockThreshold: 8,
      customerSuccessResetSeconds: 90,
      storeTimezone: 'UTC',
      logoMediaAssetId: null,
    });
    testContext.listAssets.mockResolvedValue([
      {
        id: 'media-1',
        publicId: 'kiosk/logo',
        secureUrl: 'https://res.cloudinary.com/example/image/upload/logo',
        format: 'webp',
        width: 300,
        height: 100,
        bytes: 1234,
        createdAt: '2026-08-26T00:00:00Z',
      },
    ]);
    testContext.update.mockResolvedValue({
      id: true,
      storeName: 'KISOK Hosted',
      globalLowStockThreshold: 8,
      customerSuccessResetSeconds: 90,
      storeTimezone: 'UTC',
      logoMediaAssetId: 'media-1',
    });

    render(<StoreSettingsPanel />);
    await screen.findByText('KISOK Hosted');
    await user.click(screen.getByRole('button', { name: 'Edit settings' }));
    await user.selectOptions(screen.getByLabelText('Logo media asset'), 'media-1');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() =>
      expect(testContext.update).toHaveBeenCalledWith(
        expect.objectContaining({ logoMediaAssetId: 'media-1' }),
      ),
    );
  });

  it('renders persisted hosted Store Settings rather than local placeholders', async () => {
    testContext.get.mockResolvedValue({
      id: true,
      storeName: 'KISOK Hosted',
      globalLowStockThreshold: 8,
      customerSuccessResetSeconds: 90,
      storeTimezone: 'UTC',
      logoMediaAssetId: null,
    });

    render(<StoreSettingsPanel />);

    expect(await screen.findByText('KISOK Hosted')).toBeInTheDocument();
    expect(screen.getByText('Hosted Supabase')).toBeInTheDocument();
    expect(screen.queryByText(/local workspace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/will persist once/i)).not.toBeInTheDocument();
  });
});
