import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InventoryHistoryTable } from './InventoryHistoryTable';

const mockHistory = [
  {
    id: 'adj-1',
    variantId: 'var-1',
    productName: 'Organic Yirgacheffe',
    variantName: 'Light Roast · 250g',
    sku: 'ETH-YRG-250',
    type: 'stock_received',
    delta: 20,
    quantityBefore: 5,
    quantityAfter: 25,
    reason: 'Received supplier shipment',
    createdAt: '2026-08-27T10:00:00Z',
  },
  {
    id: 'adj-2',
    variantId: 'var-2',
    productName: 'Colombian Supremo',
    variantName: 'Medium Roast · 500g',
    sku: 'COL-SUP-500',
    type: 'damaged_or_expired',
    delta: -2,
    quantityBefore: 52,
    quantityAfter: 50,
    reason: 'Water damaged bag',
    createdAt: '2026-08-27T11:00:00Z',
  },
];

describe('InventoryHistoryTable', () => {
  it('renders history entries with type, delta, result and formatted reason', () => {
    render(
      <InventoryHistoryTable
        currentPage={1}
        itemsPerPage={10}
        onPageChange={vi.fn()}
        rows={mockHistory}
        totalItems={2}
      />,
    );

    expect(screen.getByText('Organic Yirgacheffe')).toBeInTheDocument();
    expect(screen.getByText('Light Roast · 250g')).toBeInTheDocument();
    expect(screen.getByText(/Stock received/i)).toBeInTheDocument();
    expect(screen.getByText('+20')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('Received supplier shipment')).toBeInTheDocument();

    expect(screen.getByText('Colombian Supremo')).toBeInTheDocument();
    expect(screen.getByText('Medium Roast · 500g')).toBeInTheDocument();
    expect(screen.getByText(/Damaged or expired/i)).toBeInTheDocument();
    expect(screen.getByText('-2')).toBeInTheDocument();
    expect(screen.getByText('Water damaged bag')).toBeInTheDocument();
  });

  it('renders empty state when no history records exist', () => {
    render(
      <InventoryHistoryTable
        currentPage={1}
        itemsPerPage={10}
        onPageChange={vi.fn()}
        rows={[]}
        totalItems={0}
      />,
    );

    expect(screen.getByText(/no adjustment history records available/i)).toBeInTheDocument();
  });
});
