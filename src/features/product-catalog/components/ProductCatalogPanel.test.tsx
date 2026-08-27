import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listProducts: vi.fn(),
  updateProduct: vi.fn(),
}));

vi.mock('../repositories', () => ({
  productCatalogRepository: {
    listProducts: testContext.listProducts,
    updateProduct: testContext.updateProduct,
  },
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={`/en${href}`} {...props}>
      {children}
    </a>
  ),
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

    render(<ProductCatalogPanel />);

    expect(await screen.findByText('Berry Spark')).toBeInTheDocument();
    expect(screen.getByText('Northline')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.queryByText(/local workspace/i)).not.toBeInTheDocument();
  });

  it('routes primary Product work to dedicated Create, View, and Edit pages rather than opening a form dialog', async () => {
    testContext.listProducts.mockResolvedValue([baseProduct()]);

    render(<ProductCatalogPanel />);

    expect(await screen.findByText('Berry Spark')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New product' })).toHaveAttribute(
      'href',
      '/en/admin/products/create',
    );
    expect(screen.getByRole('link', { name: 'View Berry Spark' })).toHaveAttribute(
      'href',
      '/en/admin/products/product-1',
    );
    expect(screen.getByRole('link', { name: 'Edit Berry Spark' })).toHaveAttribute(
      'href',
      '/en/admin/products/product-1/edit',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('routes draft activation through Product Edit instead of bypassing shared visibility validation', async () => {
    testContext.listProducts.mockResolvedValue([baseProduct({ isActive: false })]);

    render(<ProductCatalogPanel />);

    expect(await screen.findByText('Berry Spark')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review activation Berry Spark' })).toHaveAttribute(
      'href',
      '/en/admin/products/product-1/edit',
    );
  });

  it('activates or deactivates a Product directly from the list', async () => {
    const user = userEvent.setup();
    testContext.listProducts.mockResolvedValue([baseProduct()]);
    testContext.updateProduct.mockResolvedValue({ id: 'product-1' });

    render(<ProductCatalogPanel />);
    await screen.findByText('Berry Spark');
    await user.click(screen.getByRole('button', { name: 'Deactivate Berry Spark' }));

    await waitFor(() =>
      expect(testContext.updateProduct).toHaveBeenCalledWith('product-1', { isActive: false }),
    );
  });

  it('filters the Product list by name', async () => {
    const user = userEvent.setup();
    testContext.listProducts.mockResolvedValue([
      baseProduct({ id: 'product-1', name: 'Berry Spark' }),
      baseProduct({ id: 'product-2', name: 'Cedar Roast' }),
    ]);

    render(<ProductCatalogPanel />);
    await screen.findByText('Berry Spark');
    await screen.findByText('Cedar Roast');
    await user.type(screen.getByLabelText('Search products'), 'berry');

    await waitFor(() => expect(screen.queryByText('Cedar Roast')).not.toBeInTheDocument());
    expect(screen.getByText('Berry Spark')).toBeInTheDocument();
  });

  it('paginates the Product list beyond one page', async () => {
    testContext.listProducts.mockResolvedValue(
      Array.from({ length: 25 }, (_, index) =>
        baseProduct({ id: `product-${index}`, name: `Product ${index}` }),
      ),
    );

    render(<ProductCatalogPanel />);
    await screen.findByText('Product 0');

    expect(within(screen.getByRole('navigation')).getByText('2')).toBeInTheDocument();
    expect(screen.queryByText('Product 20')).not.toBeInTheDocument();
  });
});
