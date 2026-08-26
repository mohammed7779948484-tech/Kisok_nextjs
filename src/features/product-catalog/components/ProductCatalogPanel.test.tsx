import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listProducts: vi.fn(),
  createProduct: vi.fn(),
}));

vi.mock('../repositories', () => ({
  productCatalogRepository: {
    listProducts: testContext.listProducts,
    createProduct: testContext.createProduct,
  },
}));

import { ProductCatalogPanel } from './ProductCatalogPanel';

describe('ProductCatalogPanel', () => {
  it('renders hosted product identity and operational stock', async () => {
    testContext.listProducts.mockResolvedValue([
      {
        id: 'product-1',
        name: 'Berry Spark',
        brandName: 'Northline',
        variantCount: 2,
        availableStock: 7,
        status: 'In stock',
        isActive: true,
        isFeatured: false,
      },
    ]);

    render(<ProductCatalogPanel />);

    expect(await screen.findByText('Berry Spark')).toBeInTheDocument();
    expect(screen.getByText('Northline')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.queryByText(/local workspace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/does not write to Supabase/i)).not.toBeInTheDocument();
  });

  it('persists a new Product through the repository', async () => {
    const user = userEvent.setup();
    testContext.listProducts.mockResolvedValue([]);
    testContext.createProduct.mockResolvedValue({
      id: 'product-2',
      name: 'KISOK_TEST_Product',
      brandId: null,
      shortDescription: null,
      isActive: true,
      isFeatured: false,
      coverMediaAssetId: null,
    });

    render(<ProductCatalogPanel />);
    await screen.findByText('No products are available.');
    await user.click(screen.getByRole('button', { name: 'New product' }));
    await user.type(screen.getByLabelText('Product name'), 'KISOK_TEST_Product');
    await user.click(screen.getByRole('button', { name: 'Save product' }));

    await waitFor(() =>
      expect(testContext.createProduct).toHaveBeenCalledWith({
        name: 'KISOK_TEST_Product',
        brandId: null,
        shortDescription: null,
        isFeatured: false,
      }),
    );
  });
});
