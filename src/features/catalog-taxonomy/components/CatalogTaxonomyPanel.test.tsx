import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
}));

vi.mock('../repositories', () => ({
  catalogTaxonomyRepository: {
    listCategories: testContext.listCategories,
    createCategory: testContext.createCategory,
    updateCategory: testContext.updateCategory,
  },
}));

import { CatalogTaxonomyPanel } from './CatalogTaxonomyPanel';

describe('CatalogTaxonomyPanel', () => {
  it('renders hosted Categories instead of local taxonomy workspace data', async () => {
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

    render(<CatalogTaxonomyPanel />);

    expect(await screen.findByText('Coffee')).toBeInTheDocument();
    expect(screen.queryByText(/local workspace/i)).not.toBeInTheDocument();
  });

  it('persists a new child Category through the hosted repository', async () => {
    const user = userEvent.setup();
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
    testContext.createCategory.mockResolvedValue({
      id: 'category-2',
      name: 'Cold Drinks',
      parentId: 'category-1',
      isActive: true,
      displayOrder: 1,
      imageMediaAssetId: null,
    });

    render(<CatalogTaxonomyPanel />);
    await screen.findByText('Coffee');
    await user.click(screen.getByRole('button', { name: 'Add category' }));
    await user.type(screen.getByLabelText('Category name'), 'Cold Drinks');
    await user.selectOptions(screen.getByLabelText('Parent category'), 'category-1');
    await user.click(screen.getByRole('button', { name: 'Save category' }));

    await waitFor(() =>
      expect(testContext.createCategory).toHaveBeenCalledWith({
        name: 'Cold Drinks',
        parentId: 'category-1',
      }),
    );
  });

  it('persists Category deactivation through the hosted repository', async () => {
    const user = userEvent.setup();
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
    testContext.updateCategory.mockResolvedValue({
      id: 'category-1',
      name: 'Coffee',
      parentId: null,
      isActive: false,
      displayOrder: 0,
      imageMediaAssetId: null,
    });

    render(<CatalogTaxonomyPanel />);
    await screen.findByText('Coffee');
    await user.click(screen.getByRole('button', { name: 'Deactivate Coffee' }));

    await waitFor(() =>
      expect(testContext.updateCategory).toHaveBeenCalledWith('category-1', { isActive: false }),
    );
  });
});
