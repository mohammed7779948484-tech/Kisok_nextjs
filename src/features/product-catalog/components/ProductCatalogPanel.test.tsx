import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  listProductCategoryIds: vi.fn(),
  setProductCategories: vi.fn(),
  listVariants: vi.fn(),
  createVariant: vi.fn(),
  updateVariant: vi.fn(),
  listVariantOptionValues: vi.fn(),
  replaceVariantOptionValues: vi.fn(),
  listBrands: vi.fn(),
  listCategories: vi.fn(),
  listOptionTypes: vi.fn(),
}));

vi.mock('../repositories', () => ({
  productCatalogRepository: {
    listProducts: testContext.listProducts,
    createProduct: testContext.createProduct,
    updateProduct: testContext.updateProduct,
    listProductCategoryIds: testContext.listProductCategoryIds,
    setProductCategories: testContext.setProductCategories,
    listVariants: testContext.listVariants,
    createVariant: testContext.createVariant,
    updateVariant: testContext.updateVariant,
    listVariantOptionValues: testContext.listVariantOptionValues,
    replaceVariantOptionValues: testContext.replaceVariantOptionValues,
  },
}));

vi.mock('@/features/catalog-taxonomy/repositories', () => ({
  catalogTaxonomyRepository: {
    listBrands: testContext.listBrands,
    listCategories: testContext.listCategories,
    listOptionTypes: testContext.listOptionTypes,
  },
}));

import { ProductCatalogPanel } from './ProductCatalogPanel';

function baseProduct(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'product-1',
    name: 'Berry Spark',
    brandId: 'brand-1',
    brandName: 'Northline',
    shortDescription: null,
    variantCount: 2,
    availableStock: 7,
    status: 'In stock',
    isActive: true,
    isFeatured: false,
    ...overrides,
  };
}

describe('ProductCatalogPanel', () => {
  it('renders hosted product identity and operational stock', async () => {
    testContext.listProducts.mockResolvedValue([baseProduct()]);
    testContext.listBrands.mockResolvedValue([]);
    testContext.listCategories.mockResolvedValue([]);
    testContext.listOptionTypes.mockResolvedValue([]);

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
    testContext.listOptionTypes.mockResolvedValue([]);
    testContext.createProduct.mockResolvedValue({ id: 'product-2' });

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

  it('persists a new Product with no Brand through the repository', async () => {
    const user = userEvent.setup();
    testContext.listProducts.mockResolvedValue([]);
    testContext.listBrands.mockResolvedValue([]);
    testContext.listCategories.mockResolvedValue([]);
    testContext.listOptionTypes.mockResolvedValue([]);
    testContext.createProduct.mockResolvedValue({ id: 'product-2' });

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

  it('edits an existing Product, including deactivating it', async () => {
    const user = userEvent.setup();
    testContext.listProducts.mockResolvedValue([baseProduct()]);
    testContext.listBrands.mockResolvedValue([]);
    testContext.listCategories.mockResolvedValue([]);
    testContext.listOptionTypes.mockResolvedValue([]);
    testContext.listProductCategoryIds.mockResolvedValue([]);
    testContext.updateProduct.mockResolvedValue({ id: 'product-1' });
    testContext.setProductCategories.mockResolvedValue(undefined);

    render(<ProductCatalogPanel />);
    await screen.findByText('Berry Spark');
    await user.click(screen.getByRole('button', { name: 'Edit Berry Spark' }));
    await waitFor(() => expect(screen.getByLabelText('Product name')).toHaveValue('Berry Spark'));
    await user.click(screen.getByRole('checkbox', { name: 'Active' }));
    await user.click(screen.getByRole('button', { name: 'Save product' }));

    await waitFor(() =>
      expect(testContext.updateProduct).toHaveBeenCalledWith('product-1', {
        name: 'Berry Spark',
        brandId: 'brand-1',
        shortDescription: null,
        isFeatured: false,
        isActive: false,
      }),
    );
  });

  it('activates or deactivates a Product directly from the list', async () => {
    const user = userEvent.setup();
    testContext.listProducts.mockResolvedValue([baseProduct()]);
    testContext.listBrands.mockResolvedValue([]);
    testContext.listCategories.mockResolvedValue([]);
    testContext.listOptionTypes.mockResolvedValue([]);
    testContext.updateProduct.mockResolvedValue({ id: 'product-1' });

    render(<ProductCatalogPanel />);
    await screen.findByText('Berry Spark');
    await user.click(screen.getByRole('button', { name: 'Deactivate Berry Spark' }));

    await waitFor(() =>
      expect(testContext.updateProduct).toHaveBeenCalledWith('product-1', { isActive: false }),
    );
  });

  it('filters the Products list by a name contains-search', async () => {
    const user = userEvent.setup();
    testContext.listProducts.mockResolvedValue([
      baseProduct({ id: 'product-1', name: 'Berry Spark' }),
      baseProduct({ id: 'product-2', name: 'Cedar Roast' }),
    ]);
    testContext.listBrands.mockResolvedValue([]);
    testContext.listCategories.mockResolvedValue([]);
    testContext.listOptionTypes.mockResolvedValue([]);

    render(<ProductCatalogPanel />);
    await screen.findByText('Berry Spark');
    await screen.findByText('Cedar Roast');

    await user.type(screen.getByLabelText('Search products'), 'berry');

    await waitFor(() => expect(screen.queryByText('Cedar Roast')).not.toBeInTheDocument());
    expect(screen.getByText('Berry Spark')).toBeInTheDocument();
  });

  it('paginates the Products list beyond one page', async () => {
    testContext.listProducts.mockResolvedValue(
      Array.from({ length: 25 }, (_, index) =>
        baseProduct({ id: `product-${index}`, name: `Product ${index}` }),
      ),
    );
    testContext.listBrands.mockResolvedValue([]);
    testContext.listCategories.mockResolvedValue([]);
    testContext.listOptionTypes.mockResolvedValue([]);

    render(<ProductCatalogPanel />);
    await screen.findByText('Product 0');

    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(screen.queryByText('Product 20')).not.toBeInTheDocument();
  });

  it('creates a hosted Variant from the Product editor', async () => {
    const user = userEvent.setup();
    testContext.listProducts.mockResolvedValue([
      baseProduct({ variantCount: 0, availableStock: 0, status: 'Out of stock' }),
    ]);
    testContext.listBrands.mockResolvedValue([]);
    testContext.listCategories.mockResolvedValue([]);
    testContext.listOptionTypes.mockResolvedValue([]);
    testContext.listVariants.mockResolvedValue([]);
    testContext.createVariant.mockResolvedValue({ id: 'variant-1' });

    render(<ProductCatalogPanel />);
    await screen.findByText('Berry Spark');
    await user.click(screen.getByRole('button', { name: 'Manage variants for Berry Spark' }));
    await screen.findByText('No variants are assigned to this Product.');
    await user.click(screen.getByRole('button', { name: 'Add variant' }));
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
  });

  it('edits an existing Variant from the Product editor', async () => {
    const user = userEvent.setup();
    testContext.listProducts.mockResolvedValue([baseProduct()]);
    testContext.listBrands.mockResolvedValue([]);
    testContext.listCategories.mockResolvedValue([]);
    testContext.listOptionTypes.mockResolvedValue([]);
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

    render(<ProductCatalogPanel />);
    await screen.findByText('Berry Spark');
    await user.click(screen.getByRole('button', { name: 'Manage variants for Berry Spark' }));
    await screen.findByText('KSK-000001');
    await user.click(screen.getByRole('button', { name: 'Edit KSK-000001' }));
    await user.type(screen.getByLabelText('Barcode'), '123456');
    await user.click(screen.getByRole('button', { name: 'Save variant' }));

    await waitFor(() =>
      expect(testContext.updateVariant).toHaveBeenCalledWith('variant-1', {
        barcode: '123456',
        titleOverride: null,
        lowStockThreshold: 5,
        isActive: true,
      }),
    );
  });

  it("manages a Variant's Option combination from the Product editor", async () => {
    const user = userEvent.setup();
    testContext.listProducts.mockResolvedValue([baseProduct()]);
    testContext.listBrands.mockResolvedValue([]);
    testContext.listCategories.mockResolvedValue([]);
    testContext.listOptionTypes.mockResolvedValue([
      {
        id: 'type-flavor',
        name: 'Flavor',
        isActive: true,
        displayOrder: 0,
        values: [{ id: 'value-berry', value: 'Berry', isActive: true, displayOrder: 0 }],
      },
    ]);
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
    testContext.replaceVariantOptionValues.mockResolvedValue(undefined);

    render(<ProductCatalogPanel />);
    await screen.findByText('Berry Spark');
    await user.click(screen.getByRole('button', { name: 'Manage variants for Berry Spark' }));
    await screen.findByText('KSK-000001');
    await user.click(screen.getByRole('button', { name: 'Options KSK-000001' }));
    await screen.findByText('Options · KSK-000001');

    await user.click(screen.getByRole('combobox', { name: 'Option Type' }));
    await user.click(await screen.findByRole('option', { name: 'Flavor' }));
    await user.click(screen.getByRole('combobox', { name: 'Option Value' }));
    await user.click(await screen.findByRole('option', { name: 'Berry' }));
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(screen.getByRole('button', { name: 'Save combination' }));

    await waitFor(() =>
      expect(testContext.replaceVariantOptionValues).toHaveBeenCalledWith('variant-1', [
        { optionTypeId: 'type-flavor', optionValueId: 'value-berry' },
      ]),
    );
  });
});
