import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listInventory: vi.fn(),
  applyAdjustment: vi.fn(),
  setQuantity: vi.fn(),
}));

vi.mock('../repositories', () => ({
  inventoryRepository: {
    list: testContext.listInventory,
    applyAdjustment: testContext.applyAdjustment,
    setQuantity: testContext.setQuantity,
  },
}));

import { InventoryPanel } from './InventoryPanel';

describe('InventoryPanel', () => {
  it('renders persisted inventory identity after the repository resolves', async () => {
    testContext.listInventory.mockResolvedValue([
      {
        variantId: 'variant-1',
        productId: 'product-1',
        productName: 'Berry Spark',
        sku: 'KSK-000001',
        barcode: null,
        currentQuantity: 3,
        lowStockThreshold: 4,
        isLowStock: true,
      },
    ]);

    render(<InventoryPanel />);

    expect(await screen.findByText('Berry Spark')).toBeInTheDocument();
    expect(screen.getByText(/KSK-000001/)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByText(/local workspace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/staged locally/i)).not.toBeInTheDocument();
  });

  it('derives a negative ledger delta from a positive manual-decrease quantity', async () => {
    const user = userEvent.setup();
    testContext.listInventory.mockResolvedValue([
      {
        variantId: 'variant-1',
        productId: 'product-1',
        productName: 'Berry Spark',
        sku: 'KSK-000001',
        barcode: null,
        currentQuantity: 3,
        lowStockThreshold: 4,
        isLowStock: true,
      },
    ]);
    testContext.applyAdjustment.mockResolvedValue({
      adjustmentId: 'adjustment-2',
      quantityAfter: 1,
    });

    render(<InventoryPanel />);
    await screen.findByText('Berry Spark');
    await user.click(screen.getByRole('button', { name: 'Record adjustment' }));
    await user.click(screen.getByRole('combobox', { name: 'Adjustment type' }));
    await user.click(await screen.findByRole('option', { name: 'Manual decrease' }));
    await user.clear(screen.getByLabelText('Quantity to remove'));
    await user.type(screen.getByLabelText('Quantity to remove'), '2');
    await user.type(screen.getByLabelText('Reason'), 'Damaged unit');
    await user.click(screen.getByRole('button', { name: 'Save adjustment' }));

    await waitFor(() =>
      expect(testContext.applyAdjustment).toHaveBeenCalledWith({
        adjustmentType: 'manual_decrease',
        quantityChange: -2,
        reason: 'Damaged unit',
        variantId: 'variant-1',
      }),
    );
  });

  it('explains a Set Quantity no-op instead of submitting the current quantity', async () => {
    const user = userEvent.setup();
    testContext.listInventory.mockResolvedValue([
      {
        variantId: 'variant-1',
        productId: 'product-1',
        productName: 'Berry Spark',
        sku: 'KSK-000001',
        barcode: null,
        currentQuantity: 3,
        lowStockThreshold: 4,
        isLowStock: true,
      },
    ]);

    render(<InventoryPanel />);
    await screen.findByText('Berry Spark');
    await user.click(screen.getByRole('button', { name: 'Set quantity' }));
    await user.type(
      screen.getByLabelText('Reason', { selector: '#inventory-set-quantity-reason' }),
      'Counted stock',
    );
    await user.click(screen.getByRole('button', { name: 'Save quantity' }));

    expect(await screen.findByText(/must differ from the current quantity/i)).toBeInTheDocument();
    expect(testContext.setQuantity).not.toHaveBeenCalled();
  });

  it('persists a Set Quantity request through the repository', async () => {
    const user = userEvent.setup();
    testContext.listInventory.mockResolvedValue([
      {
        variantId: 'variant-1',
        productId: 'product-1',
        productName: 'Berry Spark',
        sku: 'KSK-000001',
        barcode: null,
        currentQuantity: 3,
        lowStockThreshold: 4,
        isLowStock: true,
      },
    ]);
    testContext.setQuantity.mockResolvedValue({
      adjustmentId: 'adjustment-2',
      quantityAfter: 5,
    });

    render(<InventoryPanel />);
    await screen.findByText('Berry Spark');
    await user.click(screen.getByRole('button', { name: 'Set quantity' }));
    await user.clear(screen.getByLabelText('Final quantity'));
    await user.type(screen.getByLabelText('Final quantity'), '5');
    await user.type(
      screen.getByLabelText('Reason', { selector: '#inventory-set-quantity-reason' }),
      'Stock count correction',
    );
    await user.click(screen.getByRole('button', { name: 'Save quantity' }));

    await waitFor(() =>
      expect(testContext.setQuantity).toHaveBeenCalledWith({
        variantId: 'variant-1',
        finalQuantity: 5,
        reason: 'Stock count correction',
      }),
    );
  });
});
