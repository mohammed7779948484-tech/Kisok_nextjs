import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listProducts: vi.fn(),
}));

vi.mock('../repositories', () => ({
  productCatalogRepository: {
    listProducts: testContext.listProducts,
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
});
