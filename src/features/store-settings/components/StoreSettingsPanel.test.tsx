import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../repositories', () => ({
  storeSettingsRepository: {
    get: testContext.get,
    update: testContext.update,
  },
}));

import { StoreSettingsPanel } from './StoreSettingsPanel';

describe('StoreSettingsPanel', () => {
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
