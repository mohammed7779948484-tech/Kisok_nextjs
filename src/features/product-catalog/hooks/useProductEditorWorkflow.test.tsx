import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  createProduct: vi.fn(),
  listAssets: vi.fn(),
  listBrands: vi.fn(),
  listCategories: vi.fn(),
  listOptionTypes: vi.fn(),
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
    listAssets: testContext.listAssets,
  },
}));

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: testContext.routerReplace,
  }),
}));

vi.mock('../repositories', () => ({
  productCatalogRepository: {
    createProduct: testContext.createProduct,
  },
}));

import { ProductDraftCreatedError } from '../repositories/supabase';
import { useProductEditorWorkflow } from './useProductEditorWorkflow';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useProductEditorWorkflow', () => {
  it('creates one draft with its selected cover asset and then navigates to its edit route', async () => {
    testContext.listAssets.mockResolvedValue([]);
    testContext.listBrands.mockResolvedValue([]);
    testContext.listCategories.mockResolvedValue([]);
    testContext.listOptionTypes.mockResolvedValue([]);
    testContext.createProduct.mockResolvedValue({ id: 'product-1' });

    const { result } = renderHook(() => useProductEditorWorkflow({ mode: 'create' }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data.references.status).toBe('ready'));

    act(() => {
      result.current.form.setValue('name', 'Citrus Spark');
      result.current.form.setValue('coverMediaAssetId', 'media-1');
    });
    await act(async () => result.current.save());

    expect(testContext.createProduct).toHaveBeenCalledTimes(1);
    expect(testContext.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        coverMediaAssetId: 'media-1',
        isFeatured: false,
        name: 'Citrus Spark',
      }),
    );
    expect(testContext.routerReplace).toHaveBeenCalledWith('/admin/products/product-1/edit');
  });

  it('blocks another create and exposes the saved draft identifier after category assignment fails', async () => {
    testContext.listAssets.mockResolvedValue([]);
    testContext.listBrands.mockResolvedValue([]);
    testContext.listCategories.mockResolvedValue([]);
    testContext.listOptionTypes.mockResolvedValue([]);
    testContext.createProduct.mockRejectedValue(
      new ProductDraftCreatedError('product-2', new Error('Category assignment rejected.')),
    );

    const { result } = renderHook(() => useProductEditorWorkflow({ mode: 'create' }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data.references.status).toBe('ready'));

    act(() => result.current.form.setValue('name', 'Citrus Spark'));
    await act(async () => result.current.save());

    await waitFor(() => expect(result.current.recoveryDraftId).toBe('product-2'));
    expect(result.current.canSave).toBe(false);
  });
});
