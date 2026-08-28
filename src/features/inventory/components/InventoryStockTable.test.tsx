import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InventoryStockTable } from './InventoryStockTable';

const mockRows = [
  {
    variantId: 'var-1',
    productId: 'prod-1',
    productName: 'Organic Yirgacheffe',
    variantName: 'Light Roast · 250g',
    sku: 'ETH-YRG-250',
    barcode: '890123456',
    currentQuantity: 4,
    lowStockThreshold: 10,
    isLowStock: true,
  },
  {
    variantId: 'var-2',
    productId: 'prod-2',
    productName: 'Colombian Supremo',
    variantName: 'Medium Roast · 500g',
    sku: 'COL-SUP-500',
    barcode: null,
    currentQuantity: 50,
    lowStockThreshold: 15,
    isLowStock: false,
  },
];

describe('InventoryStockTable', () => {
  it('renders inventory rows with product details and status pills', () => {
    const onAdjust = vi.fn();
    render(
      <InventoryStockTable
        currentPage={1}
        itemsPerPage={10}
        onAdjust={onAdjust}
        onPageChange={vi.fn()}
        rows={mockRows}
        totalItems={2}
      />,
    );

    expect(screen.getByText('Organic Yirgacheffe')).toBeInTheDocument();
    expect(screen.getByText('Light Roast · 250g')).toBeInTheDocument();
    expect(screen.getByText(/ETH-YRG-250/i)).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('triggers onAdjust when clicking adjust button', () => {
    const onAdjust = vi.fn();
    render(
      <InventoryStockTable
        currentPage={1}
        itemsPerPage={10}
        onAdjust={onAdjust}
        onPageChange={vi.fn()}
        rows={mockRows}
        totalItems={2}
      />,
    );

    const adjustButtons = screen.getAllByRole('button', { name: /adjust/i });
    fireEvent.click(adjustButtons[0]);

    expect(onAdjust).toHaveBeenCalledWith(mockRows[0]);
  });

  it('renders empty message when no rows match', () => {
    render(
      <InventoryStockTable
        currentPage={1}
        itemsPerPage={10}
        onAdjust={vi.fn()}
        onPageChange={vi.fn()}
        rows={[]}
        totalItems={0}
      />,
    );

    expect(screen.getByText(/no inventory records match your criteria/i)).toBeInTheDocument();
  });
});
