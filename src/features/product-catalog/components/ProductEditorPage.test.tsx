import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listAssets: vi.fn(),
  listAssetsPage: vi.fn(),
  listBrands: vi.fn(),
  listCategories: vi.fn(),
  listOptionTypes: vi.fn(),
  createProduct: vi.fn(),
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
}));

vi.mock('@/features/catalog-taxonomy/repositories', () => ({
  catalogTaxonomyRepository: {
    listBrands: testContext.listBrands,
    listCategories: testContext.listCategories,
    listOptionTypes: testContext.listOptionTypes,
  },
}));

vi.mock('@/features/media-library/repositories', () => ({
  mediaLibraryRepository: {
    getAsset: vi.fn(),
    listAssets: testContext.listAssets,
    listAssetsPage: testContext.listAssetsPage,
  },
}));

vi.mock('../repositories', () => ({
  productCatalogRepository: {
    createProduct: testContext.createProduct,
  },
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={`/en${href}`} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    push: testContext.routerPush,
    replace: testContext.routerReplace,
  }),
}));

import { ProductDraftCreatedError } from '../repositories/supabase';
import { ProductEditorPage } from './ProductEditorPage';

function resolveCreateReferences() {
  testContext.listAssets.mockResolvedValue([]);
  testContext.listAssetsPage.mockResolvedValue({ assets: [], total: 0 });
  testContext.listBrands.mockResolvedValue([]);
  testContext.listCategories.mockResolvedValue([]);
  testContext.listOptionTypes.mockResolvedValue([]);
}

function renderProductEditor() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ProductEditorPage mode="create" />
    </QueryClientProvider>,
  );
}

describe('ProductEditorPage', () => {
  it('keeps unsaved Product Details state while switching between workflow tabs', async () => {
    resolveCreateReferences();
    const user = userEvent.setup();

    renderProductEditor();

    const nameInput = await screen.findByLabelText('Product name');
    await user.type(nameInput, 'Citrus Spark');

    expect(screen.getByRole('tab', { name: 'Product details' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.click(screen.getByRole('tab', { name: 'Variants' }));

    expect(
      screen.getByText(/Save this Product draft before creating Variants\./),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Product details' }));
    expect(screen.getByLabelText('Product name')).toHaveValue('Citrus Spark');
  });

  it('opens the visual Media picker from the Product cover control', async () => {
    resolveCreateReferences();
    const user = userEvent.setup();

    renderProductEditor();

    await user.click(await screen.findByRole('button', { name: 'Add Product image' }));

    expect(await screen.findByRole('dialog')).toHaveTextContent('Media Library');
  });

  it('exposes the saved draft recovery route after category assignment fails', async () => {
    resolveCreateReferences();
    testContext.createProduct.mockRejectedValue(
      new ProductDraftCreatedError('product-2', new Error('Category assignment rejected.')),
    );
    const user = userEvent.setup();

    renderProductEditor();
    await user.type(await screen.findByLabelText('Product name'), 'Citrus Spark');
    await user.click(screen.getByRole('button', { name: 'Save & add Variants' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('saved as an inactive draft');
    expect(screen.getByRole('link', { name: 'Open saved draft' })).toHaveAttribute(
      'href',
      '/en/admin/products/product-2/edit',
    );
    expect(screen.getByRole('button', { name: 'Save & add Variants' })).toBeDisabled();
  });

  it('provides a targeted retry action when Product reference data cannot load', async () => {
    testContext.listAssets.mockResolvedValue([]);
    testContext.listBrands.mockRejectedValue(new Error('Brands could not be loaded.'));
    testContext.listCategories.mockResolvedValue([]);
    testContext.listOptionTypes.mockResolvedValue([]);

    renderProductEditor();

    expect(await screen.findByRole('alert')).toHaveTextContent('Brands could not be loaded.');
    expect(screen.getByRole('button', { name: 'Retry loading Product context' })).toBeEnabled();
  });
});
