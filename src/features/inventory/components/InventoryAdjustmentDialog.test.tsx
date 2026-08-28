import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { InventoryAdjustmentDialog } from './InventoryAdjustmentDialog';

const mockVariant = {
  variantId: 'var-123',
  productId: 'prod-456',
  productName: 'Single Origin Espresso',
  variantName: '250g · Whole Bean',
  sku: 'SOE-250G',
  barcode: '123456789',
  currentQuantity: 25,
  lowStockThreshold: 10,
  isLowStock: false,
};

describe('InventoryAdjustmentDialog', () => {
  it('renders target variant details and submits apply change form', async () => {
    const user = userEvent.setup();
    const onApplyChange = vi.fn().mockResolvedValue(undefined);
    const onSetQuantity = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();

    render(
      <InventoryAdjustmentDialog
        isOpen
        onApplyChange={onApplyChange}
        onCancel={onCancel}
        onSetQuantity={onSetQuantity}
        target={mockVariant}
      />,
    );

    expect(screen.getByText(/Single Origin Espresso/i)).toBeInTheDocument();
    expect(screen.getByText(/SOE-250G/i)).toBeInTheDocument();
    expect(screen.getByText(/Current quantity: 25/i)).toBeInTheDocument();

    const quantityInput = screen.getByRole('spinbutton', { name: /^quantity/i });
    const reasonInput = screen.getByPlaceholderText(/supplier delivery/i);

    await user.clear(quantityInput);
    await user.type(quantityInput, '5');
    await user.type(reasonInput, 'Received batch shipment');

    const submitBtn = screen.getByRole('button', { name: /save adjustment/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(onApplyChange).toHaveBeenCalledWith({
        adjustmentType: 'stock_received',
        quantityChange: 5,
        reason: 'Received batch shipment',
      });
    });
  });

  it('switches to set final quantity tab and submits set quantity form', async () => {
    const user = userEvent.setup();
    const onApplyChange = vi.fn().mockResolvedValue(undefined);
    const onSetQuantity = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();

    render(
      <InventoryAdjustmentDialog
        isOpen
        onApplyChange={onApplyChange}
        onCancel={onCancel}
        onSetQuantity={onSetQuantity}
        target={mockVariant}
      />,
    );

    const setQuantityTab = screen.getByRole('tab', { name: /set final quantity/i });
    await user.click(setQuantityTab);

    const finalQuantityInput = screen.getByRole('spinbutton', { name: /final quantity/i });
    const reasonInput = screen.getByPlaceholderText(/physical recount/i);

    await user.clear(finalQuantityInput);
    await user.type(finalQuantityInput, '30');
    await user.type(reasonInput, 'Monthly audit recount');

    const submitBtn = screen.getByRole('button', { name: /save quantity/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(onSetQuantity).toHaveBeenCalledWith({
        finalQuantity: 30,
        reason: 'Monthly audit recount',
      });
    });
  });

  it('prevents submitting set quantity when final quantity matches current quantity', async () => {
    const user = userEvent.setup();
    const onSetQuantity = vi.fn();

    render(
      <InventoryAdjustmentDialog
        isOpen
        onApplyChange={vi.fn()}
        onCancel={vi.fn()}
        onSetQuantity={onSetQuantity}
        target={mockVariant}
      />,
    );

    const setQuantityTab = screen.getByRole('tab', { name: /set final quantity/i });
    await user.click(setQuantityTab);

    const finalQuantityInput = screen.getByRole('spinbutton', { name: /final quantity/i });
    const reasonInput = screen.getByPlaceholderText(/physical recount/i);

    await user.clear(finalQuantityInput);
    await user.type(finalQuantityInput, '25'); // Matches currentQuantity
    await user.type(reasonInput, 'Same count');

    const submitBtn = screen.getByRole('button', { name: /save quantity/i });
    await user.click(submitBtn);

    expect(
      await screen.findByText(/Set Quantity must differ from the current quantity/i),
    ).toBeInTheDocument();
    expect(onSetQuantity).not.toHaveBeenCalled();
  });
});
