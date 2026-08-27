'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { mediaLibraryRepository } from '@/features/media-library/repositories';
import { useRouter } from '@/i18n/navigation';
import { useConfirmLeave, useUnsavedChangesGuard } from '@/shared/navigation/UnsavedChangesGuard';

import { productCatalogRepository } from '../repositories';
import { ProductDraftCreatedError } from '../repositories/supabase';
import {
  optionalText,
  type ProductEditorFormValues,
  type ProductEditorValues,
  productEditorDefaultValues,
  productEditorSchema,
} from '../schemas/product-editor.schema';
import type { ProductDetailRecord } from '../types';
import { getProductVisibility } from '../utils/product-visibility';
import { useProductEditorData } from './useProductEditorData';

type EditorMode = 'create' | 'edit' | 'show';

type ProductEditorWorkflowParams = {
  mode: EditorMode;
  productId?: string;
};

function toFormValues(
  product: ProductDetailRecord,
  categoryIds: string[],
): ProductEditorFormValues {
  return {
    brandId: product.brandId,
    categoryIds,
    coverMediaAssetId: product.coverMediaAssetId,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    name: product.name,
    searchKeywords: product.searchKeywords?.join(', ') ?? '',
    shortDescription: product.shortDescription ?? '',
  };
}

export function useProductEditorWorkflow({ mode, productId }: ProductEditorWorkflowParams) {
  const router = useRouter();
  const form = useForm<ProductEditorFormValues, undefined, ProductEditorValues>({
    defaultValues: productEditorDefaultValues,
    resolver: zodResolver(productEditorSchema),
  });
  const data = useProductEditorData({ mode, productId });
  const initializedContext = useRef<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [recoveryDraftId, setRecoveryDraftId] = useState<string | null>(null);

  useEffect(() => {
    if (data.references.status !== 'ready') return;
    if (mode === 'create') {
      if (initializedContext.current !== 'create') {
        form.reset(productEditorDefaultValues);
        initializedContext.current = 'create';
      }
      return;
    }
    if (data.product.status !== 'ready' || data.categoryIds.status !== 'ready' || !productId)
      return;
    const loadedProduct = data.product.data;
    if (!loadedProduct) return;
    const contextKey = `product:${productId}`;
    if (initializedContext.current !== contextKey) {
      form.reset(toFormValues(loadedProduct, data.categoryIds.data));
      initializedContext.current = contextKey;
    }
  }, [data.categoryIds, data.product, data.references.status, form, mode, productId]);

  useEffect(() => {
    if (mode === 'show' || !form.formState.isDirty || isSaving) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [form.formState.isDirty, isSaving, mode]);

  // Guards ALL in-app navigation (sidebar links, header links, …) while
  // this editor is dirty — not just the browser-native unload case above
  // and not just the one dedicated "Back to Products" button.
  const isUnsaved = mode !== 'show' && form.formState.isDirty && !isSaving;
  useUnsavedChangesGuard(isUnsaved ? 'Discard unsaved Product changes?' : null);
  const confirmLeave = useConfirmLeave();

  const values = form.watch();
  const selectedBrand = data.references.brands.find((brand) => brand.id === values.brandId) ?? null;
  const selectedCategories = data.references.categories.filter((category) =>
    values.categoryIds.includes(category.id),
  );
  const selectedCoverQuery = useQuery({
    queryKey: ['product-editor', 'cover-media', values.coverMediaAssetId],
    queryFn: () => mediaLibraryRepository.getAsset(values.coverMediaAssetId as string),
    enabled: Boolean(values.coverMediaAssetId),
  });
  const selectedCover = selectedCoverQuery.data ?? null;
  const optionStatesById = useMemo(
    () =>
      new Map(
        data.references.optionTypes.map((optionType) => [
          optionType.id,
          {
            isActive: optionType.isActive,
            values: new Map(optionType.values.map((value) => [value.id, value])),
          },
        ]),
      ),
    [data.references.optionTypes],
  );
  const activationDependenciesReady =
    data.variants.status === 'ready' && data.variantOptions.status === 'ready';
  const visibility = useMemo(() => {
    const calculated = getProductVisibility({
      brand: selectedBrand,
      dependencyDataReady: activationDependenciesReady,
      isActive: values.isActive,
      variants: data.variants.data.map((variant) => ({
        id: variant.id,
        isActive: variant.isActive,
        sku: variant.sku,
        optionValues: (data.variantOptions.byVariantId[variant.id] ?? []).map((selection) => {
          const optionType = optionStatesById.get(selection.optionTypeId);
          const optionValue = optionType?.values.get(selection.optionValueId);
          return {
            optionTypeIsActive: optionType?.isActive ?? false,
            optionTypeName: selection.optionTypeName,
            optionValueIsActive: optionValue?.isActive ?? false,
            optionValueName: selection.optionValueName,
          };
        }),
      })),
    });
    if (data.variantOptions.status !== 'error') return calculated;
    return {
      isCustomerVisible: false,
      reasons: [
        ...calculated.reasons,
        'Variant Option Values could not be loaded. Retry before activation.',
      ],
    };
  }, [
    activationDependenciesReady,
    data.variantOptions,
    data.variants.data,
    optionStatesById,
    selectedBrand,
    values.isActive,
  ]);

  const canWriteRelations =
    data.references.status === 'ready' &&
    (mode === 'create' || data.categoryIds.status === 'ready');

  async function save() {
    await form.handleSubmit(async (valuesToSave) => {
      if (!canWriteRelations) {
        setSaveError(
          'Product Categories are still loading or failed to load. Retry before saving.',
        );
        return;
      }
      if (valuesToSave.isActive && !visibility.isCustomerVisible) {
        setSaveError(`This Product cannot be activated: ${visibility.reasons.join(' ')}`);
        return;
      }

      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);
      setRecoveryDraftId(null);
      try {
        if (mode === 'create') {
          const created = await productCatalogRepository.createProduct({
            brandId: valuesToSave.brandId,
            categoryIds: valuesToSave.categoryIds,
            coverMediaAssetId: valuesToSave.coverMediaAssetId,
            isFeatured: valuesToSave.isFeatured,
            name: valuesToSave.name,
            searchKeywords:
              valuesToSave.searchKeywords.length > 0 ? valuesToSave.searchKeywords : null,
            shortDescription: optionalText(valuesToSave.shortDescription),
          });
          form.reset(productEditorDefaultValues);
          router.replace(`/admin/products/${created.id}/edit`);
          return;
        }
        if (!productId) throw new Error('Missing Product id.');
        await productCatalogRepository.updateProduct(productId, {
          brandId: valuesToSave.brandId,
          coverMediaAssetId: valuesToSave.coverMediaAssetId,
          isActive: valuesToSave.isActive,
          isFeatured: valuesToSave.isFeatured,
          name: valuesToSave.name,
          searchKeywords:
            valuesToSave.searchKeywords.length > 0 ? valuesToSave.searchKeywords : null,
          shortDescription: optionalText(valuesToSave.shortDescription),
        });
        await productCatalogRepository.setProductCategories(productId, valuesToSave.categoryIds);
        const persisted = data.product.data;
        if (persisted) {
          form.reset(toFormValues({ ...persisted, ...valuesToSave }, valuesToSave.categoryIds));
        }
        setSaveMessage('Product saved.');
        await data.refetch();
      } catch (error) {
        if (error instanceof ProductDraftCreatedError) {
          setRecoveryDraftId(error.productId);
        }
        setSaveError(error instanceof Error ? error.message : 'Product could not be saved.');
      } finally {
        setIsSaving(false);
      }
    })();
  }

  function leaveEditor() {
    if (!confirmLeave()) return;
    router.push('/admin/products');
  }

  return {
    canSave: mode !== 'show' && !isSaving && canWriteRelations && recoveryDraftId === null,
    canToggleActivation: mode !== 'create' && activationDependenciesReady,
    data,
    form,
    isReadOnly: mode === 'show',
    isSaving,
    leaveEditor,
    save,
    saveError,
    saveMessage,
    recoveryDraftId,
    selectedBrand,
    selectedCategories,
    selectedCover,
    values,
    visibility,
  };
}
