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
        items: [],
      },
    ]);

    render(<OrdersPanel />);

    expect(await screen.findByText('KSK-001')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.queryByText(/staged/i)).not.toBeInTheDocument();
  });

  it('renders immutable operational Order Item details without financial fields', async () => {
    testContext.listOrders.mockResolvedValue([
      {
        id: 'order-1',
        displayNumber: 'KSK-001',
        status: 'preparing',
        createdAt: '2026-08-26T10:00:00Z',
        itemCount: 1,
        items: [
          {
            id: 'item-1',
            productName: 'Cedar Mug',
            variantName: 'Large',
            variantSku: 'KSK-000001',
            variantOptions: 'Size: Large',
            brandName: 'Kisok Studio',
            quantity: 2,
          },
        ],
      },
    ]);

    render(<OrdersPanel />);

    expect(await screen.findByText('Cedar Mug')).toBeInTheDocument();
    expect(screen.getByText('Large · KSK-000001')).toBeInTheDocument();
    expect(screen.getByText('Size: Large')).toBeInTheDocument();
    expect(screen.getByText('Quantity 2')).toBeInTheDocument();
    expect(screen.queryByText(/price|currency|amount|total/i)).not.toBeInTheDocument();
  });

  it('cancels an active order only after a reason is supplied', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    testContext.listOrders.mockResolvedValue([
      {
        id: 'order-1',
        displayNumber: 'KSK-001',
        status: 'preparing',
        createdAt: '2026-08-26T10:00:00Z',
        itemCount: 1,
        items: [],
      },
    ]);
    testContext.updateStatus.mockResolvedValue({});

    render(<OrdersPanel />);
    await screen.findByText('KSK-001');
    await user.click(screen.getByRole('button', { name: 'Cancel order' }));

    const reason = screen.getByRole('textbox', { name: 'Cancellation reason' });
    expect(screen.getByRole('button', { name: 'Confirm cancellation' })).toBeDisabled();

    await user.type(reason, 'Customer request');
    await user.click(screen.getByRole('button', { name: 'Confirm cancellation' }));

    expect(testContext.updateStatus).toHaveBeenCalledWith(
      'order-1',
      'cancelled',
      'Customer request',
    );
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
        items: [],
      },
    ]);
    testContext.updateStatus.mockResolvedValue({});

    render(<OrdersPanel />);
    await screen.findByText('KSK-001');
    await user.click(screen.getByRole('button', { name: 'Advance status' }));

    expect(testContext.updateStatus).toHaveBeenCalledWith('order-1', 'preparing');
  });
});
