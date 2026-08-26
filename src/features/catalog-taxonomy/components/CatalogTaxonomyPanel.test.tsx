import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listBrands: vi.fn(),
  listCategories: vi.fn(),
  createBrand: vi.fn(),
}));

vi.mock('../repositories', () => ({
  catalogTaxonomyRepository: {
    listBrands: testContext.listBrands,
    listCategories: testContext.listCategories,
    createBrand: testContext.createBrand,
  },
}));

import { CatalogTaxonomyPanel } from './CatalogTaxonomyPanel';

describe('CatalogTaxonomyPanel', () => {
  it('renders hosted Brands instead of local taxonomy workspace data', async () => {
    testContext.listBrands.mockResolvedValue([
      {
        id: 'brand-1',
        name: 'Northline',
        isActive: true,
        displayOrder: 0,
        imageMediaAssetId: null,
      },
    ]);

    render(<CatalogTaxonomyPanel />);

    expect(await screen.findByText('Northline')).toBeInTheDocument();
    expect(screen.queryByText(/local workspace/i)).not.toBeInTheDocument();
  });

  it('renders hosted Categories when the categories view is selected', async () => {
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

    render(<CatalogTaxonomyPanel mode="categories" />);

    expect(await screen.findByText('Coffee')).toBeInTheDocument();
    expect(screen.queryByText('Brands')).not.toBeInTheDocument();
  });

  it('persists a new Brand through the repository', async () => {
    const user = userEvent.setup();
    testContext.listBrands.mockResolvedValue([]);
    testContext.createBrand.mockResolvedValue({
      id: 'brand-2',
      name: 'KISOK_TEST_Brand',
      isActive: true,
      displayOrder: 1,
      imageMediaAssetId: null,
    });

    render(<CatalogTaxonomyPanel />);
    await screen.findByText('No brands match this search.');
    await user.click(screen.getByRole('button', { name: 'Add brand' }));
    await user.type(screen.getByLabelText('Brand name'), 'KISOK_TEST_Brand');
    await user.click(screen.getByRole('button', { name: 'Save brand' }));

    await waitFor(() =>
      expect(testContext.createBrand).toHaveBeenCalledWith({ name: 'KISOK_TEST_Brand' }),
    );
  });
});
