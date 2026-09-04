import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { InventoryRecord } from '../types';
import { InventoryKpiSummary } from './InventoryKpiSummary';

const mockRows: InventoryRecord[] = [
  {
    variantId: 'var-1',
    productId: 'prod-1',
    productName: 'Berry Spark',
    variantName: 'Berry · Small',
    sku: 'KSK-000001',
    barcode: null,
    currentQuantity: 10,
    lowStockThreshold: 5,
    isLowStock: false,
  },
  {
    variantId: 'var-2',
    productId: 'prod-2',
    productName: 'Mint Breeze',
    variantName: '500ml',
    sku: 'KSK-000002',
    barcode: null,
    currentQuantity: 3,
    lowStockThreshold: 5,
    isLowStock: true,
  },
  {
    variantId: 'var-3',
    productId: 'prod-3',
    productName: 'Zero Coke',
    variantName: 'Can',
    sku: 'KSK-000003',
    barcode: null,
    currentQuantity: 0,
    lowStockThreshold: 2,
    isLowStock: true,
  },
];

describe('InventoryKpiSummary', () => {
  it('computes and renders summary metrics accurately', () => {
    render(<InventoryKpiSummary rows={mockRows} />);

    // Total variants: 3
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/Total variants/i)).toBeInTheDocument();

    // Total units: 10 + 3 + 0 = 13
    expect(screen.getByText('13')).toBeInTheDocument();
    expect(screen.getByText(/Total stock units/i)).toBeInTheDocument();

    // Low stock: 2 (var-2, var-3)
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/Low stock review/i)).toBeInTheDocument();

    // Out of stock: 1 (var-3)
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/Out of stock/i)).toBeInTheDocument();
  });
});
