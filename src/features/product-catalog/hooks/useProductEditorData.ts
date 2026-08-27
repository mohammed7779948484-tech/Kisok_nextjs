'use client';

import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { catalogTaxonomyRepository } from '@/features/catalog-taxonomy/repositories';
import type {
  BrandRecord,
  CategoryRecord,
  OptionTypeRecord,
} from '@/features/catalog-taxonomy/types';
import { mediaLibraryRepository } from '@/features/media-library/repositories';

import { productCatalogRepository } from '../repositories';
import type { ProductDetailRecord, VariantOptionValueRecord, VariantRecord } from '../types';
import { getVariantEligibility } from '../utils/product-visibility';

type EditorMode = 'create' | 'edit' | 'show';

type QueryResource<T> =
  | { status: 'loading'; data: T; error: null }
  | { status: 'error'; data: T; error: Error }
  | { status: 'ready'; data: T; error: null }
  | { status: 'not-requested'; data: T; error: null };

export type ProductEditorReferences = {
  brands: BrandRecord[];
  categories: CategoryRecord[];
  optionTypes: OptionTypeRecord[];
};

type ProductEditorDataParams = {
  mode: EditorMode;
  productId?: string;
};

const emptyReferences: ProductEditorReferences = {
  brands: [],
  categories: [],
  optionTypes: [],
};

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('The Product editor data could not be loaded.');
}

function toQueryResource<T>(
  query: {
    data: T | undefined;
    error: unknown;
    isError: boolean;
    isPending: boolean;
  },
  emptyData: T,
): QueryResource<T> {
  if (query.isPending) return { status: 'loading', data: emptyData, error: null };
  if (query.isError) return { status: 'error', data: emptyData, error: toError(query.error) };
  return { status: 'ready', data: query.data ?? emptyData, error: null };
}

export function useProductEditorData({ mode, productId }: ProductEditorDataParams) {
  const referencesQuery = useQuery({
    queryKey: ['product-editor', 'references'],
    queryFn: async (): Promise<ProductEditorReferences> => {
      const [brands, categories, optionTypes] = await Promise.all([
        catalogTaxonomyRepository.listBrands(),
        catalogTaxonomyRepository.listCategories(),
        catalogTaxonomyRepository.listOptionTypes(),
      ]);
      return { brands, categories, optionTypes };
    },
  });

  const shouldLoadProduct = mode !== 'create' && Boolean(productId);
  const productQuery = useQuery({
    queryKey: ['product-editor', 'product', productId],
    queryFn: () => productCatalogRepository.getProduct(productId as string),
    enabled: shouldLoadProduct,
  });
  const categoryIdsQuery = useQuery({
    queryKey: ['product-editor', 'categories', productId],
    queryFn: () => productCatalogRepository.listProductCategoryIds(productId as string),
    enabled: shouldLoadProduct,
  });
  const variantsQuery = useQuery({
    queryKey: ['product-editor', 'variants', productId],
    queryFn: () => productCatalogRepository.listVariants(productId as string),
    enabled: shouldLoadProduct,
  });
  const variantIds = variantsQuery.data?.map((variant) => variant.id) ?? [];
  const variantMediaQuery = useQuery({
    queryKey: ['product-editor', 'variant-media', productId, variantIds],
    queryFn: async (): Promise<Record<string, number>> => {
      const entries = await Promise.all(
        variantIds.map(async (variantId) => [
          variantId,
          (await mediaLibraryRepository.listVariantMedia(variantId)).length,
        ]),
      );
      return Object.fromEntries(entries);
    },
    enabled: shouldLoadProduct && variantsQuery.isSuccess,
  });
  const variantOptionsQuery = useQuery({
    queryKey: ['product-editor', 'variant-options', productId, variantIds],
    queryFn: async (): Promise<Record<string, VariantOptionValueRecord[]>> => {
      const entries = await Promise.all(
        variantIds.map(async (variantId) => [
          variantId,
          await productCatalogRepository.listVariantOptionValues(variantId),
        ]),
      );
      return Object.fromEntries(entries);
    },
    enabled: shouldLoadProduct && variantsQuery.isSuccess,
  });

  const product: QueryResource<ProductDetailRecord | null> = shouldLoadProduct
    ? toQueryResource(productQuery, null)
    : { status: 'not-requested', data: null, error: null };
  const categoryIds: QueryResource<string[]> = shouldLoadProduct
    ? toQueryResource(categoryIdsQuery, [])
    : { status: 'not-requested', data: [], error: null };
  const variants: QueryResource<VariantRecord[]> = shouldLoadProduct
    ? toQueryResource(variantsQuery, [])
    : { status: 'not-requested', data: [], error: null };
  const variantMedia: QueryResource<Record<string, number>> = !shouldLoadProduct
    ? { status: 'not-requested', data: {}, error: null }
    : variantsQuery.isError
      ? {
          status: 'error',
          data: {},
          error: new Error('Variant Media cannot load until Variants load successfully.'),
        }
      : toQueryResource(variantMediaQuery, {});
  const variantOptions: QueryResource<Record<string, VariantOptionValueRecord[]>> =
    !shouldLoadProduct
      ? { status: 'not-requested', data: {}, error: null }
      : variantsQuery.isError
        ? {
            status: 'error',
            data: {},
            error: new Error('Variant Option Values cannot load until Variants load successfully.'),
          }
        : toQueryResource(variantOptionsQuery, {});

  const references = toQueryResource(referencesQuery, emptyReferences);
  const variantEligibilityById = useMemo(() => {
    const optionStates = new Map(
      referencesQuery.data?.optionTypes.flatMap((optionType) =>
        optionType.values.map((value) => [value.id, { optionType, value }] as const),
      ) ?? [],
    );
    if (!(referencesQuery.isSuccess && variantsQuery.isSuccess && variantOptionsQuery.isSuccess)) {
      return Object.fromEntries(
        (variantsQuery.data ?? []).map((variant) => [
          variant.id,
          {
            isCustomerEligible: false,
            reasons: ['Variant eligibility is still loading.'],
          },
        ]),
      );
    }
    return Object.fromEntries(
      (variantsQuery.data ?? []).map((variant) => [
        variant.id,
        getVariantEligibility({
          isActive: variant.isActive,
          optionValues: (variantOptionsQuery.data?.[variant.id] ?? []).map((selection) => {
            const state = optionStates.get(selection.optionValueId);
            return {
              optionTypeIsActive: state?.optionType.isActive ?? false,
              optionTypeName: selection.optionTypeName,
              optionValueIsActive: state?.value.isActive ?? false,
              optionValueName: selection.optionValueName,
            };
          }),
          sku: variant.sku,
        }),
      ]),
    );
  }, [
    referencesQuery.data,
    referencesQuery.isSuccess,
    variantOptionsQuery.data,
    variantOptionsQuery.isSuccess,
    variantsQuery.data,
    variantsQuery.isSuccess,
  ]);

  return {
    references: {
      ...references,
      ...references.data,
    },
    product,
    categoryIds,
    variants,
    variantMedia: {
      ...variantMedia,
      countsByVariantId: variantMedia.data,
    },
    variantMediaCounts: variantMedia.data,
    variantEligibilityById,
    variantOptions: {
      ...variantOptions,
      byVariantId: variantOptions.data,
    },
    refetch: async () => {
      await Promise.all([
        referencesQuery.refetch(),
        ...(shouldLoadProduct
          ? [
              productQuery.refetch(),
              categoryIdsQuery.refetch(),
              variantsQuery.refetch(),
              variantMediaQuery.refetch(),
              variantOptionsQuery.refetch(),
            ]
          : []),
      ]);
    },
    refetchVariants: variantsQuery.refetch,
    refetchVariantMedia: variantMediaQuery.refetch,
    refetchVariantOptions: variantOptionsQuery.refetch,
  };
}
