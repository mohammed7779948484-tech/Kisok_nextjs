import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listProducts: vi.fn(),
  createProduct: vi.fn(),
  listVariants: vi.fn(),
  createVariant: vi.fn(),
  updateVariant: vi.fn(),
  listBrands: vi.fn(),
  listCategories: vi.fn(),
}));

vi.mock('../repositories', () => ({
  productCatalogRepository: {
    listProducts: testContext.listProducts,
    createProduct: testContext.createProduct,
    listVariants: testContext.listVariants,
    createVariant: testContext.createVariant,
    updateVariant: testContext.updateVariant,
  },
}));

vi.mock('@/features/catalog-taxonomy/repositories', () => ({
  catalogTaxonomyRepository: {
    listBrands: testContext.listBrands,
    listCategories: testContext.listCategories,
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

  it('persists a Product with a selected Brand and Category assignments', async () => {
    const user = userEvent.setup();
    testContext.listProducts.mockResolvedValue([]);
    testContext.listBrands.mockResolvedValue([
      {
        id: 'brand-1',
        name: 'Northline',
        isActive: true,
        displayOrder: 0,
        imageMediaAssetId: null,
      },
    ]);
    testContext.listCategories.mockResolvedValue([
      {
        id: 'category-1',
        name: 'Coffee',
        parentId: null,
        isActive: true,
        displayOrder: 0,
        imageMediaAssetId: null,
      },
    ]);
    testContext.createProduct.mockResolvedValue({
      id: 'product-2',
      name: 'KISOK_TEST_Product',
      brandId: 'brand-1',
      shortDescription: null,
      isActive: true,
      isFeatured: false,
      coverMediaAssetId: null,
    });

    render(<ProductCatalogPanel />);
    await screen.findByText('No products are available.');
    await user.click(screen.getByRole('button', { name: 'New product' }));
    await user.type(screen.getByLabelText('Product name'), 'KISOK_TEST_Product');
    await user.selectOptions(screen.getByLabelText('Brand'), 'brand-1');
    await user.click(screen.getByLabelText('Coffee'));
    await user.click(screen.getByRole('button', { name: 'Save product' }));

    await waitFor(() =>
      expect(testContext.createProduct).toHaveBeenCalledWith({
        name: 'KISOK_TEST_Product',
        brandId: 'brand-1',
        shortDescription: null,
        isFeatured: false,
        categoryIds: ['category-1'],
      }),
    );
  });

  it('creates a hosted Variant from the Product editor', async () => {
    const user = userEvent.setup();
    testContext.listProducts.mockResolvedValue([
      {
        id: 'product-1',
        name: 'Berry Spark',
        brandName: 'Northline',
        variantCount: 0,
        availableStock: 0,
        status: 'Out of stock',
        isActive: true,
        isFeatured: false,
      },
    ]);
    testContext.listBrands.mockResolvedValue([]);
    testContext.listCategories.mockResolvedValue([]);
    testContext.listVariants.mockResolvedValue([]);
    testContext.createVariant.mockResolvedValue({
      id: 'variant-1',
      productId: 'product-1',
      sku: 'KSK-000001',
      barcode: null,
      titleOverride: 'Single',
      isActive: true,
      lowStockThreshold: 5,
    });

    render(<ProductCatalogPanel />);
    await screen.findByText('Berry Spark');
    await user.click(screen.getByRole('button', { name: 'Manage variants for Berry Spark' }));
    await user.click(screen.getByRole('button', { name: 'Add variant' }));
    await user.type(screen.getByLabelText('Variant title'), 'Single');
    await user.click(screen.getByRole('button', { name: 'Save variant' }));

    await waitFor(() =>
      expect(testContext.createVariant).toHaveBeenCalledWith({
        productId: 'product-1',
        titleOverride: 'Single',
        lowStockThreshold: 5,
      }),
    );
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
