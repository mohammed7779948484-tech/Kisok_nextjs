import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/infrastructure/supabase/client/server-client', () => ({
  getServerSupabaseClient: async () => ({}),
}));
vi.mock('@/infrastructure/supabase/dashboard-operations/adapter', () => ({
  getDashboardOperationalSnapshot: async () => ({
    status: 'ready',
    snapshot: {
      activeProductCount: 0,
      variantCount: 0,
      unavailableVariantCount: 0,
      lowStockCount: 0,
      openOrderCount: 0,
      brandCount: 0,
      categoryCount: 0,
      mediaAssetCount: 0,
      recentOrders: [],
    },
  }),
}));

import { OperationalDashboard } from './OperationalDashboard';

describe('OperationalDashboard', () => {
  it('labels a rendered snapshot without claiming unverified live connectivity', async () => {
    render(await OperationalDashboard());

    expect(screen.queryByText('Live operational data')).not.toBeInTheDocument();
    expect(screen.getByText('Operational snapshot')).toBeInTheDocument();
  });
});
