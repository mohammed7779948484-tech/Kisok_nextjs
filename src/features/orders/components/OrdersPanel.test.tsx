import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({ listOrders: vi.fn(), updateStatus: vi.fn() }));

vi.mock('../repositories', () => ({
  ordersRepository: { listOrders: testContext.listOrders, updateStatus: testContext.updateStatus },
}));

import { OrdersPanel } from './OrdersPanel';

describe('OrdersPanel', () => {
  it('renders hosted operational order records instead of local staged data', async () => {
    testContext.listOrders.mockResolvedValue([
      {
        id: 'order-1',
        displayNumber: 'KSK-001',
        status: 'new',
        createdAt: '2026-08-26T10:00:00Z',
        itemCount: 2,
      },
    ]);

    render(<OrdersPanel />);

    expect(await screen.findByText('KSK-001')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.queryByText(/staged/i)).not.toBeInTheDocument();
  });

  it('advances an active order through the hosted status mutation', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    testContext.listOrders.mockResolvedValue([
      {
        id: 'order-1',
        displayNumber: 'KSK-001',
        status: 'new',
        createdAt: '2026-08-26T10:00:00Z',
        itemCount: 2,
      },
    ]);
    testContext.updateStatus.mockResolvedValue({});

    render(<OrdersPanel />);
    await screen.findByText('KSK-001');
    await user.click(screen.getByRole('button', { name: 'Advance status' }));

    expect(testContext.updateStatus).toHaveBeenCalledWith('order-1', 'preparing');
  });
});
