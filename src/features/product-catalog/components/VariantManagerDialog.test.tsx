import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listVariants: vi.fn(),
  createVariant: vi.fn(),
  updateVariant: vi.fn(),
  listVariantOptionValues: vi.fn(),
  replaceVariantOptionValues: vi.fn(),
}));

vi.mock('../repositories', () => ({
  productCatalogRepository: {
    listVariants: testContext.listVariants,
    createVariant: testContext.createVariant,
    updateVariant: testContext.updateVariant,
    listVariantOptionValues: testContext.listVariantOptionValues,
    replaceVariantOptionValues: testContext.replaceVariantOptionValues,
  },
}));

import { VariantManagerDialog } from './VariantManagerDialog';

const PRODUCT = {
  id: 'product-1',
  name: 'Berry Spark',
  brandId: null,
  brandName: null,
  shortDescription: null,
  variantCount: 1,
  availableStock: 5,
  status: 'In stock' as const,
  isActive: true,
  isFeatured: false,
  searchKeywords: [],
  variantBarcodes: [],
  variantSkus: [],
};

describe('VariantManagerDialog', () => {
  it('lists Variants for the Product', async () => {
    testContext.listVariants.mockResolvedValue([
      {
        id: 'variant-1',
        productId: 'product-1',
        sku: 'KSK-000001',
        barcode: null,
        titleOverride: null,
        isActive: true,
        lowStockThreshold: 5,
      },
    ]);

    render(
      <VariantManagerDialog
        onOpenChange={() => undefined}
        onVariantsChanged={() => undefined}
        open
        optionTypes={[]}
        product={PRODUCT}
      />,
    );

    expect(await screen.findByText('KSK-000001')).toBeInTheDocument();
  });

  it('creates a Variant and refreshes the list', async () => {
    const user = userEvent.setup();
    const onVariantsChanged = vi.fn();
    testContext.listVariants.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'variant-1',
        productId: 'product-1',
        sku: 'KSK-000001',
        barcode: null,
        titleOverride: 'Single',
        isActive: true,
        lowStockThreshold: 5,
      },
    ]);
    testContext.createVariant.mockResolvedValue({ id: 'variant-1' });

    render(
      <VariantManagerDialog
        onOpenChange={() => undefined}
        onVariantsChanged={onVariantsChanged}
        open
        optionTypes={[]}
        product={PRODUCT}
      />,
    );

    await screen.findByText('No variants are assigned to this Product.');
    await user.click(screen.getByRole('button', { name: 'Add variant' }));
    await user.click(screen.getByRole('button', { name: /custom title override/i }));
    await user.type(screen.getByLabelText(/title override/i), 'Single');
    await user.click(screen.getByRole('button', { name: 'Save variant' }));

    await waitFor(() =>
      expect(testContext.createVariant).toHaveBeenCalledWith({
        productId: 'product-1',
        barcode: null,
        titleOverride: 'Single',
        lowStockThreshold: 5,
      }),
    );
    expect(onVariantsChanged).toHaveBeenCalled();
  });

  it('edits a Variant', async () => {
    const user = userEvent.setup();
    testContext.listVariants.mockResolvedValue([
      {
        id: 'variant-1',
        productId: 'product-1',
        sku: 'KSK-000001',
        barcode: null,
        titleOverride: null,
        isActive: true,
        lowStockThreshold: 5,
      },
    ]);
    testContext.updateVariant.mockResolvedValue({ id: 'variant-1' });

    render(
      <VariantManagerDialog
        onOpenChange={() => undefined}
        onVariantsChanged={() => undefined}
        open
        optionTypes={[]}
        product={PRODUCT}
      />,
    );

    await screen.findByText('KSK-000001');
    await user.click(screen.getByRole('button', { name: 'Edit KSK-000001' }));
    await user.type(screen.getByLabelText('Barcode'), '999');
    await user.click(screen.getByRole('button', { name: 'Save variant' }));

    await waitFor(() =>
      expect(testContext.updateVariant).toHaveBeenCalledWith('variant-1', {
        barcode: '999',
        titleOverride: null,
        lowStockThreshold: 5,
        isActive: true,
      }),
    );
  });

  it('opens the Options manager for a Variant', async () => {
    const user = userEvent.setup();
    testContext.listVariants.mockResolvedValue([
      {
        id: 'variant-1',
        productId: 'product-1',
        sku: 'KSK-000001',
        barcode: null,
        titleOverride: null,
        isActive: true,
        lowStockThreshold: 5,
      },
    ]);
    testContext.listVariantOptionValues.mockResolvedValue([]);

    render(
      <VariantManagerDialog
        onOpenChange={() => undefined}
        onVariantsChanged={() => undefined}
        open
        optionTypes={[]}
        product={PRODUCT}
      />,
    );

    await screen.findByText('KSK-000001');
    await user.click(screen.getByRole('button', { name: 'Options KSK-000001' }));

    expect(await screen.findByText('Options · KSK-000001')).toBeInTheDocument();
  });
});
