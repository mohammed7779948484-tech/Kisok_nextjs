import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  setProductCategories: vi.fn(),
  listProductCategoryIds: vi.fn(),
}));

vi.mock('../repositories', () => ({
  productCatalogRepository: {
    createProduct: testContext.createProduct,
    updateProduct: testContext.updateProduct,
    setProductCategories: testContext.setProductCategories,
    listProductCategoryIds: testContext.listProductCategoryIds,
  },
}));

import { ProductFormDialog } from './ProductFormDialog';

const BRANDS = [{ id: 'brand-1', name: 'Northline' }];
const CATEGORIES = [
  { id: 'category-1', name: 'Coffee', parentId: null },
  { id: 'category-2', name: 'Tea', parentId: null },
];

describe('ProductFormDialog', () => {
  it('creates a Product with the selected Brand and Categories', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    testContext.createProduct.mockResolvedValue({ id: 'product-2' });

    render(
      <ProductFormDialog
        brands={BRANDS}
        categories={CATEGORIES}
        mode="create"
        onOpenChange={() => undefined}
        onSaved={onSaved}
        open
      />,
    );

    await user.type(screen.getByLabelText('Product name'), 'Berry Spark');
    await user.selectOptions(screen.getByLabelText('Brand'), 'brand-1');
    await user.click(screen.getByLabelText('Coffee'));
    await user.click(screen.getByRole('button', { name: 'Save product' }));

    await waitFor(() =>
      expect(testContext.createProduct).toHaveBeenCalledWith({
        name: 'Berry Spark',
        brandId: 'brand-1',
        shortDescription: null,
        isFeatured: false,
        categoryIds: ['category-1'],
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it('prefills the Edit form from the Product and its current Categories', async () => {
    testContext.listProductCategoryIds.mockResolvedValue(['category-2']);

    render(
      <ProductFormDialog
        brands={BRANDS}
        categories={CATEGORIES}
        mode="edit"
        onOpenChange={() => undefined}
        onSaved={() => undefined}
        open
        product={{
          id: 'product-1',
          name: 'Berry Spark',
          brandId: 'brand-1',
          brandName: 'Northline',
          shortDescription: 'Nice',
          variantCount: 1,
          availableStock: 1,
          status: 'In stock',
          isActive: true,
          isFeatured: false,
          searchKeywords: [],
          variantBarcodes: [],
          variantSkus: [],
        }}
      />,
    );

    expect(screen.getByLabelText('Product name')).toHaveValue('Berry Spark');
    expect(screen.getByLabelText('Brand')).toHaveValue('brand-1');
    await waitFor(() => expect(screen.getByLabelText('Tea')).toBeChecked());
    expect(screen.getByLabelText('Coffee')).not.toBeChecked();
  });

  it('updates a Product, reassigns Categories, and can deactivate it', async () => {
    const user = userEvent.setup();
    testContext.listProductCategoryIds.mockResolvedValue(['category-1']);
    testContext.updateProduct.mockResolvedValue({ id: 'product-1' });
    testContext.setProductCategories.mockResolvedValue(undefined);

    render(
      <ProductFormDialog
        brands={BRANDS}
        categories={CATEGORIES}
        mode="edit"
        onOpenChange={() => undefined}
        onSaved={() => undefined}
        open
        product={{
          id: 'product-1',
          name: 'Berry Spark',
          brandId: 'brand-1',
          brandName: 'Northline',
          shortDescription: null,
          variantCount: 1,
          availableStock: 1,
          status: 'In stock',
          isActive: true,
          isFeatured: false,
          searchKeywords: [],
          variantBarcodes: [],
          variantSkus: [],
        }}
      />,
    );

    await waitFor(() => expect(screen.getByLabelText('Coffee')).toBeChecked());
    await user.click(screen.getByRole('checkbox', { name: 'Active' }));
    await user.click(screen.getByLabelText('Tea'));
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
    expect(testContext.setProductCategories).toHaveBeenCalledWith('product-1', [
      'category-1',
      'category-2',
    ]);
  });
});
