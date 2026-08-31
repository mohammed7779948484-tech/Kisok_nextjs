import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { VariantFormDialog } from './VariantFormDialog';

describe('VariantFormDialog', () => {
  it('creates a Variant with the entered operational fields', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);

    render(
      <VariantFormDialog
        mode="create"
        onCreate={onCreate}
        onOpenChange={() => undefined}
        open
        productId="product-1"
      />,
    );

    await user.type(screen.getByLabelText('Barcode'), '0123456789');
    await user.click(screen.getByRole('button', { name: /custom title override/i }));
    await user.type(screen.getByLabelText(/title override/i), 'Berry Single');
    await user.click(screen.getByRole('button', { name: 'Save variant' }));

    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({
        productId: 'product-1',
        barcode: '0123456789',
        titleOverride: 'Berry Single',
        lowStockThreshold: 5,
      }),
    );
  });

  it('prompts confirmation when attempting to close dirty Variant form', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <VariantFormDialog
        mode="create"
        onCreate={vi.fn()}
        onOpenChange={onOpenChange}
        open
        productId="product-1"
      />,
    );

    // Modify a field
    await user.type(screen.getByLabelText('Barcode'), '999888');

    // Click Cancel
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    // Discard confirmation should appear
    expect(await screen.findByText('Discard unsaved Variant changes?')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();

    // Confirm discard
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('never shows an editable SKU field — SKU is database-generated', () => {
    render(
      <VariantFormDialog
        mode="edit"
        onOpenChange={() => undefined}
        onUpdate={vi.fn()}
        open
        variant={{
          id: 'variant-1',
          productId: 'product-1',
          sku: 'KSK-000001',
          barcode: null,
          titleOverride: null,
          isActive: true,
          lowStockThreshold: 5,
        }}
      />,
    );

    expect(screen.queryByLabelText(/sku/i)).not.toBeInTheDocument();
    expect(screen.getByText('KSK-000001')).toBeInTheDocument();
  });

  it('updates an existing Variant, including deactivating it', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);

    render(
      <VariantFormDialog
        mode="edit"
        onOpenChange={() => undefined}
        onUpdate={onUpdate}
        open
        variant={{
          id: 'variant-1',
          productId: 'product-1',
          sku: 'KSK-000001',
          barcode: '111',
          titleOverride: 'Old title',
          isActive: true,
          lowStockThreshold: 5,
        }}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Active' }));
    await user.click(screen.getByRole('button', { name: 'Save variant' }));

    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith('variant-1', {
        barcode: '111',
        titleOverride: 'Old title',
        lowStockThreshold: 5,
        isActive: false,
      }),
    );
  });
});
