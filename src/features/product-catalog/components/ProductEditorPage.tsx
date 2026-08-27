'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { ImageIcon, PencilIcon, PlusIcon } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { catalogTaxonomyRepository } from '@/features/catalog-taxonomy/repositories';
import type {
  BrandRecord,
  CategoryRecord,
  OptionTypeRecord,
} from '@/features/catalog-taxonomy/types';
import { VariantMediaPicker } from '@/features/media-library/components/VariantMediaPicker';
import { mediaLibraryRepository } from '@/features/media-library/repositories';
import type { MediaAssetRecord } from '@/features/media-library/types';
import { Link, useRouter } from '@/i18n/navigation';
import {
  KisokButton,
  KisokDialog,
  KisokDialogContent,
  KisokDialogDescription,
  KisokDialogFooter,
  KisokDialogHeader,
  KisokDialogTitle,
  KisokInput,
  KisokTextarea,
  StatusPill,
} from '@/shared/ui';

import { productCatalogRepository } from '../repositories';
import type { ProductDetailRecord, VariantRecord } from '../types';
import { deriveVariantDisplayName } from '../utils/variant-display-name';
import { VariantFormDialog } from './VariantFormDialog';
import { VariantOptionsDialog } from './VariantOptionsDialog';

const productEditorSchema = z.object({
  brandId: z.string().nullable(),
  categoryIds: z.array(z.string()),
  coverMediaAssetId: z.string().nullable(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  name: z.string().trim().min(1, 'Product name is required.'),
  searchKeywords: z.string(),
  shortDescription: z.string(),
});

type ProductEditorValues = z.infer<typeof productEditorSchema>;
type HydrationStatus = 'loading' | 'ready' | 'error';

type VariantDialogState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; variant: VariantRecord };

function VariantDisplayName({ variant }: { variant: VariantRecord }) {
  const [selections, setSelections] = useState<import('../types').VariantOptionValueRecord[]>([]);

  useEffect(() => {
    let active = true;
    void productCatalogRepository
      .listVariantOptionValues(variant.id)
      .then((loaded) => {
        if (active) setSelections(loaded);
      })
      .catch(() => {
        if (active) setSelections([]);
      });
    return () => {
      active = false;
    };
  }, [variant.id]);

  return <>{deriveVariantDisplayName(variant.titleOverride, selections, variant.sku)}</>;
}

const createDefaults: ProductEditorValues = {
  brandId: null,
  categoryIds: [],
  coverMediaAssetId: null,
  isActive: false,
  isFeatured: false,
  name: '',
  searchKeywords: '',
  shortDescription: '',
};

function toValues(product: ProductDetailRecord, categoryIds: string[]): ProductEditorValues {
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

function parseKeywords(value: string): string[] | null {
  const keywords = [
    ...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
  return keywords.length > 0 ? keywords : null;
}

function getVisibilityReasons(
  values: ProductEditorValues,
  brands: BrandRecord[],
  variants: VariantRecord[],
): string[] {
  const reasons: string[] = [];
  if (!values.isActive) reasons.push('Product is a draft.');
  const brand = brands.find((item) => item.id === values.brandId);
  if (brand && !brand.isActive) reasons.push('Assigned Brand is inactive.');
  if (values.isActive && variants.length === 0) reasons.push('No Variant exists yet.');
  if (values.isActive && variants.length > 0 && !variants.some((item) => item.isActive)) {
    reasons.push('No active Variant is available.');
  }
  return reasons;
}

export function ProductEditorPage({
  mode,
  productId,
}: {
  mode: 'create' | 'edit' | 'show';
  productId?: string;
}) {
  const router = useRouter();
  const form = useForm<ProductEditorValues>({
    defaultValues: createDefaults,
    resolver: zodResolver(productEditorSchema),
  });
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [optionTypes, setOptionTypes] = useState<OptionTypeRecord[]>([]);
  const [assets, setAssets] = useState<MediaAssetRecord[]>([]);
  const [variants, setVariants] = useState<VariantRecord[]>([]);
  const [product, setProduct] = useState<ProductDetailRecord | null>(null);
  const [referenceStatus, setReferenceStatus] = useState<HydrationStatus>('loading');
  const [relationStatus, setRelationStatus] = useState<HydrationStatus>('loading');
  const [pageError, setPageError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [variantDialog, setVariantDialog] = useState<VariantDialogState>({ open: false });
  const [optionsVariant, setOptionsVariant] = useState<VariantRecord | null>(null);
  const [mediaVariant, setMediaVariant] = useState<VariantRecord | null>(null);
  const [deleteState, setDeleteState] = useState<{
    variant: VariantRecord;
    historyBlocked: boolean;
  } | null>(null);
  const [isDeletingVariant, setIsDeletingVariant] = useState(false);

  const load = useCallback(async () => {
    let resolved = false;
    setPageError(null);
    setSaveError(null);
    setReferenceStatus('loading');
    setRelationStatus(mode === 'create' ? 'ready' : 'loading');
    setProduct(null);
    setVariants([]);

    try {
      const references = await Promise.all([
        catalogTaxonomyRepository.listBrands(),
        catalogTaxonomyRepository.listCategories(),
        catalogTaxonomyRepository.listOptionTypes(),
        mediaLibraryRepository.listAssets(),
      ]);
      setBrands(references[0]);
      setCategories(references[1]);
      setOptionTypes(references[2]);
      setAssets(references[3]);
      setReferenceStatus('ready');

      if (mode === 'create') {
        form.reset(createDefaults);
        resolved = true;
        return;
      }
      if (!productId) throw new Error('Missing Product id.');

      const [detail, categoryIds, loadedVariants] = await Promise.all([
        productCatalogRepository.getProduct(productId),
        productCatalogRepository.listProductCategoryIds(productId),
        productCatalogRepository.listVariants(productId),
      ]);
      setProduct(detail);
      setVariants(loadedVariants);
      form.reset(toValues(detail, categoryIds));
      setRelationStatus('ready');
      resolved = true;
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Product data could not be loaded.');
      setReferenceStatus('error');
      setRelationStatus('error');
    } finally {
      if (!resolved && mode === 'create') setRelationStatus('error');
    }
  }, [form, mode, productId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (mode === 'show' || !form.formState.isDirty || isSaving) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [form.formState.isDirty, isSaving, mode]);

  const values = form.watch();
  const selectedBrand = brands.find((item) => item.id === values.brandId) ?? null;
  const selectedCategories = categories.filter((item) => values.categoryIds.includes(item.id));
  const cover = assets.find((item) => item.id === values.coverMediaAssetId) ?? null;
  const visibilityReasons = useMemo(
    () => getVisibilityReasons(values, brands, variants),
    [brands, values, variants],
  );
  const isReadOnly = mode === 'show';
  const canWriteRelations = referenceStatus === 'ready' && relationStatus === 'ready';

  async function refreshVariants() {
    if (!productId) return;
    try {
      setVariants(await productCatalogRepository.listVariants(productId));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Variants could not be refreshed.');
    }
  }

  async function confirmVariantDeletion() {
    if (!deleteState) return;
    setIsDeletingVariant(true);
    setSaveError(null);
    try {
      if (deleteState.historyBlocked) {
        await productCatalogRepository.updateVariant(deleteState.variant.id, { isActive: false });
        await refreshVariants();
        setDeleteState(null);
        return;
      }
      const result = await productCatalogRepository.deleteVariant(deleteState.variant.id);
      if (result.outcome === 'history-blocked') {
        setDeleteState({ historyBlocked: true, variant: deleteState.variant });
        return;
      }
      await refreshVariants();
      setDeleteState(null);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'Variant deletion could not be completed.',
      );
    } finally {
      setIsDeletingVariant(false);
    }
  }

  async function save(valuesToSave: ProductEditorValues) {
    if (isReadOnly || !canWriteRelations) {
      setSaveError('Categories are still loading or failed to load. Retry before saving.');
      return;
    }
    const activationBlocks = getVisibilityReasons(valuesToSave, brands, variants).filter(
      (reason) => reason !== 'Product is a draft.',
    );
    if (valuesToSave.isActive && activationBlocks.length > 0) {
      setSaveError(`This Product cannot be activated: ${activationBlocks.join(' ')}`);
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      if (mode === 'create') {
        const created = await productCatalogRepository.createProduct({
          name: valuesToSave.name,
          brandId: valuesToSave.brandId,
          categoryIds: valuesToSave.categoryIds,
          isFeatured: valuesToSave.isFeatured,
          searchKeywords: parseKeywords(valuesToSave.searchKeywords),
          shortDescription: valuesToSave.shortDescription || null,
        });
        if (valuesToSave.coverMediaAssetId) {
          await productCatalogRepository.updateProduct(created.id, {
            coverMediaAssetId: valuesToSave.coverMediaAssetId,
          });
        }
        router.replace(`/admin/products/${created.id}/edit`);
        return;
      }

      if (!productId) throw new Error('Missing Product id.');
      await productCatalogRepository.updateProduct(productId, {
        brandId: valuesToSave.brandId,
        coverMediaAssetId: valuesToSave.coverMediaAssetId,
        isActive: valuesToSave.isActive,
        isFeatured: valuesToSave.isFeatured,
        searchKeywords: parseKeywords(valuesToSave.searchKeywords),
        name: valuesToSave.name,
        shortDescription: valuesToSave.shortDescription || null,
      });
      await productCatalogRepository.setProductCategories(productId, valuesToSave.categoryIds);
      form.reset(valuesToSave);
      router.replace(`/admin/products/${productId}`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Product could not be saved.');
    } finally {
      setIsSaving(false);
    }
  }

  function leaveEditor() {
    if (!isReadOnly && form.formState.isDirty && !isSaving) {
      if (!window.confirm('Discard unsaved Product changes?')) return;
    }
    router.push('/admin/products');
  }

  function toggleCategory(categoryId: string, checked: boolean) {
    const current = form.getValues('categoryIds');
    form.setValue(
      'categoryIds',
      checked ? [...current, categoryId] : current.filter((id) => id !== categoryId),
      { shouldDirty: true },
    );
  }

  return (
    <section className="border border-border bg-card p-5 text-card-foreground sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
            Product catalog /{' '}
            {mode === 'create' ? 'new draft' : mode === 'show' ? 'read-only' : 'edit'}
          </p>
          <h1 className="mt-2 font-black text-4xl tracking-[-0.08em] sm:text-5xl">
            {mode === 'create' ? 'Create Product' : (product?.name ?? 'Product')}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground text-sm">
            {mode === 'create'
              ? 'New Products are saved as drafts. Configure Variants and customer visibility before activation.'
              : 'Manage product identity, classification, Media, and Variants in one dedicated workflow.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <KisokButton onClick={leaveEditor} variant="outline">
            Back to Products
          </KisokButton>
          {mode === 'show' && productId ? (
            <Link href={`/admin/products/${productId}/edit`}>
              <KisokButton variant="outline">
                <PencilIcon /> Edit Product
              </KisokButton>
            </Link>
          ) : null}
          {!isReadOnly ? (
            <KisokButton
              disabled={isSaving || !canWriteRelations}
              onClick={() => void form.handleSubmit(save)()}
            >
              {isSaving ? 'Saving…' : mode === 'create' ? 'Save draft' : 'Save Product'}
            </KisokButton>
          ) : null}
        </div>
      </div>

      {referenceStatus === 'loading' || relationStatus === 'loading' ? (
        <p className="mt-6 text-muted-foreground text-sm" role="status">
          Loading Product context…
        </p>
      ) : null}
      {pageError ? (
        <div className="mt-6 grid gap-3" role="alert">
          <p className="text-destructive text-sm">{pageError}</p>
          <KisokButton onClick={() => void load()} variant="outline">
            Retry loading Product context
          </KisokButton>
        </div>
      ) : null}
      {saveError ? (
        <p className="mt-6 text-destructive text-sm" role="alert">
          {saveError}
        </p>
      ) : null}

      {referenceStatus === 'ready' && relationStatus === 'ready' ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid gap-6">
            <section className="border border-border p-5">
              <div className="border-border border-b pb-4">
                <h2 className="font-black text-2xl tracking-[-0.06em]">Basic information</h2>
                <p className="mt-1 text-muted-foreground text-sm">
                  Product identity, description, customer state, and search keywords.
                </p>
              </div>
              <div className="mt-5 grid gap-5">
                <label className="grid gap-2" htmlFor="product-name">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
                    Product name
                  </span>
                  <KisokInput disabled={isReadOnly} id="product-name" {...form.register('name')} />
                  {form.formState.errors.name ? (
                    <span className="text-destructive text-sm">
                      {form.formState.errors.name.message}
                    </span>
                  ) : null}
                </label>
                <label className="grid gap-2" htmlFor="product-description">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
                    Description
                  </span>
                  <KisokTextarea
                    disabled={isReadOnly}
                    id="product-description"
                    {...form.register('shortDescription')}
                  />
                </label>
                <label className="grid gap-2" htmlFor="product-keywords">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
                    Search keywords
                  </span>
                  <KisokInput
                    disabled={isReadOnly}
                    id="product-keywords"
                    placeholder="e.g. berry, sparkling, seasonal"
                    {...form.register('searchKeywords')}
                  />
                  <span className="text-muted-foreground text-xs">
                    Separate keywords with commas.
                  </span>
                </label>
                <div className="flex flex-wrap gap-6">
                  <Controller
                    control={form.control}
                    name="isFeatured"
                    render={({ field }) => (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={field.value}
                          disabled={isReadOnly}
                          id="product-featured"
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                        <Label htmlFor="product-featured">Feature this Product</Label>
                      </div>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={field.value}
                          disabled={isReadOnly || mode === 'create'}
                          id="product-active"
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                        <Label htmlFor="product-active">
                          {mode === 'create'
                            ? 'Draft (activation follows setup)'
                            : 'Active Product'}
                        </Label>
                      </div>
                    )}
                  />
                </div>
              </div>
            </section>

            <section className="border border-border p-5">
              <div className="border-border border-b pb-4">
                <h2 className="font-black text-2xl tracking-[-0.06em]">Classification</h2>
                <p className="mt-1 text-muted-foreground text-sm">
                  Associate a Brand and one or more Categories. Existing inactive dependencies
                  remain visible.
                </p>
              </div>
              <div className="mt-5 grid gap-5">
                <div className="grid gap-2">
                  <Label>Brand</Label>
                  <Controller
                    control={form.control}
                    name="brandId"
                    render={({ field }) => (
                      <Select
                        disabled={isReadOnly}
                        onValueChange={(value) =>
                          field.onChange(value === '__none__' ? null : String(value))
                        }
                        value={field.value ?? '__none__'}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="No Brand" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="__none__">No Brand</SelectItem>
                            {brands.map((brand) => (
                              <SelectItem key={brand.id} value={brand.id}>
                                {brand.name}
                                {!brand.isActive ? ' — Inactive' : ''}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {selectedBrand && !selectedBrand.isActive ? (
                    <p className="text-amber-700 text-sm dark:text-amber-300">
                      This Product keeps an inactive Brand assignment. It cannot be customer-visible
                      while this dependency is inactive.
                    </p>
                  ) : null}
                </div>
                <fieldset className="grid gap-3">
                  <legend className="font-medium text-sm">Categories</legend>
                  {categories.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No Categories are available.</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {categories.map((category) => {
                        const checked = values.categoryIds.includes(category.id);
                        const checkboxId = `product-category-${category.id}`;
                        return (
                          <label
                            className="flex items-center gap-2 text-sm"
                            htmlFor={checkboxId}
                            key={category.id}
                          >
                            <Checkbox
                              checked={checked}
                              id={checkboxId}
                              disabled={isReadOnly}
                              onCheckedChange={(next) => toggleCategory(category.id, next === true)}
                            />
                            <span>
                              {category.parentId ? '↳ ' : ''}
                              {category.name}
                              {!category.isActive ? ' — Inactive' : ''}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </fieldset>
              </div>
            </section>

            <section className="border border-border p-5">
              <div className="border-border border-b pb-4">
                <h2 className="font-black text-2xl tracking-[-0.06em]">Product Media</h2>
                <p className="mt-1 text-muted-foreground text-sm">
                  Select the reusable Media Asset used as this Product’s cover.
                </p>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-[13rem_1fr]">
                <div className="flex aspect-square items-center justify-center overflow-hidden border border-dashed border-border bg-muted">
                  {cover ? (
                    <img
                      alt={`${values.name || 'Product'} cover`}
                      className="h-full w-full object-cover"
                      src={cover.secureUrl}
                    />
                  ) : (
                    <ImageIcon className="size-9 text-muted-foreground" />
                  )}
                </div>
                <div className="grid content-start gap-3">
                  <Label>Cover Media Asset</Label>
                  <Controller
                    control={form.control}
                    name="coverMediaAssetId"
                    render={({ field }) => (
                      <Select
                        disabled={isReadOnly}
                        onValueChange={(value) =>
                          field.onChange(value === '__none__' ? null : String(value))
                        }
                        value={field.value ?? '__none__'}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="No cover Media" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="__none__">No cover Media</SelectItem>
                            {assets.map((asset) => (
                              <SelectItem key={asset.id} value={asset.id}>
                                {asset.publicId}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Link className="w-fit text-sm underline underline-offset-4" href="/admin/media">
                    Manage Media Assets
                  </Link>
                </div>
              </div>
            </section>

            {mode !== 'create' && productId ? (
              <section className="border border-border p-5">
                <div className="flex flex-col justify-between gap-3 border-border border-b pb-4 sm:flex-row sm:items-end">
                  <div>
                    <h2 className="font-black text-2xl tracking-[-0.06em]">Variants</h2>
                    <p className="mt-1 text-muted-foreground text-sm">
                      Manage sellable Lean V2 Product Variants without leaving this Product
                      workflow.
                    </p>
                  </div>
                  {!isReadOnly ? (
                    <KisokButton
                      onClick={() => setVariantDialog({ mode: 'create', open: true })}
                      variant="outline"
                    >
                      <PlusIcon /> Add Variant
                    </KisokButton>
                  ) : null}
                </div>
                {variants.length === 0 ? (
                  <p className="mt-4 text-muted-foreground text-sm">
                    No Variants are configured yet.
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-border border-y border-border">
                    {variants.map((variant) => (
                      <div
                        className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                        key={variant.id}
                      >
                        <div>
                          <p className="font-mono text-sm">{variant.sku}</p>
                          <p className="mt-1 text-muted-foreground text-xs">
                            <VariantDisplayName variant={variant} />
                            {variant.barcode ? ` · Barcode: ${variant.barcode}` : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill
                            className={
                              variant.isActive ? undefined : 'border-destructive text-destructive'
                            }
                          >
                            {variant.isActive ? 'Active' : 'Inactive'}
                          </StatusPill>
                          {isReadOnly ? null : (
                            <>
                              <KisokButton
                                onClick={() => setOptionsVariant(variant)}
                                size="sm"
                                variant="quiet"
                              >
                                Options
                              </KisokButton>
                              <KisokButton
                                onClick={() => setMediaVariant(variant)}
                                size="sm"
                                variant="quiet"
                              >
                                Media
                              </KisokButton>
                              <KisokButton
                                onClick={() =>
                                  setVariantDialog({ mode: 'edit', open: true, variant })
                                }
                                size="sm"
                                variant="quiet"
                              >
                                Edit
                              </KisokButton>
                              <KisokButton
                                onClick={() => setDeleteState({ historyBlocked: false, variant })}
                                size="sm"
                                variant="quiet"
                              >
                                Delete
                              </KisokButton>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : null}
          </div>

          <aside className="h-fit border border-border p-5 xl:sticky xl:top-5">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
              Customer visibility
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill
                className={
                  values.isActive
                    ? undefined
                    : 'border-amber-500 text-amber-700 dark:text-amber-300'
                }
              >
                {values.isActive ? 'Active' : 'Draft'}
              </StatusPill>
              <StatusPill
                className={
                  visibilityReasons.length === 0
                    ? undefined
                    : 'border-amber-500 text-amber-700 dark:text-amber-300'
                }
              >
                {visibilityReasons.length === 0 ? 'Customer visible' : 'Customer hidden'}
              </StatusPill>
            </div>
            {visibilityReasons.length === 0 ? (
              <p className="mt-4 text-sm">
                The Product meets the currently observable Admin visibility checks.
              </p>
            ) : (
              <ul className="mt-4 grid gap-2 text-muted-foreground text-sm">
                {visibilityReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
            <div className="mt-6 border-border border-t pt-4 text-muted-foreground text-sm">
              <p>Brand: {selectedBrand?.name ?? 'No Brand assigned'}</p>
              <p className="mt-2">Categories: {selectedCategories.length}</p>
              <p className="mt-2">Variants: {variants.length}</p>
            </div>
          </aside>
        </div>
      ) : null}

      {variantDialog.open && variantDialog.mode === 'create' && productId ? (
        <VariantFormDialog
          mode="create"
          onCreate={async (input) => {
            await productCatalogRepository.createVariant(input);
            await refreshVariants();
          }}
          onOpenChange={(open) => {
            if (!open) setVariantDialog({ open: false });
          }}
          open
          productId={productId}
        />
      ) : null}
      {variantDialog.open && variantDialog.mode === 'edit' ? (
        <VariantFormDialog
          mode="edit"
          onOpenChange={(open) => {
            if (!open) setVariantDialog({ open: false });
          }}
          onUpdate={async (id, input) => {
            await productCatalogRepository.updateVariant(id, input);
            await refreshVariants();
          }}
          open
          variant={variantDialog.variant}
        />
      ) : null}
      {optionsVariant ? (
        <VariantOptionsDialog
          onOpenChange={(open) => {
            if (!open) setOptionsVariant(null);
          }}
          open
          optionTypes={optionTypes}
          siblingVariants={variants
            .filter((variant) => variant.id !== optionsVariant.id)
            .map((variant) => ({ id: variant.id, sku: variant.sku }))}
          variantId={optionsVariant.id}
          variantLabel={optionsVariant.sku}
        />
      ) : null}
      {deleteState ? (
        <KisokDialog
          onOpenChange={(open) => {
            if (!(open || isDeletingVariant)) setDeleteState(null);
          }}
          open
        >
          <KisokDialogContent>
            <KisokDialogHeader>
              <KisokDialogTitle>
                {deleteState.historyBlocked
                  ? `Delete blocked · ${deleteState.variant.sku}`
                  : `Delete Variant · ${deleteState.variant.sku}`}
              </KisokDialogTitle>
              <KisokDialogDescription>
                {deleteState.historyBlocked
                  ? 'This Variant is referenced by historical orders, so Lean V2 protects it from deletion. You may deactivate it instead; historical records will remain intact.'
                  : 'This permanently deletes the Variant only if it has no protected historical order references.'}
              </KisokDialogDescription>
            </KisokDialogHeader>
            <KisokDialogFooter>
              <KisokButton
                disabled={isDeletingVariant}
                onClick={() => setDeleteState(null)}
                variant="quiet"
              >
                Cancel
              </KisokButton>
              <KisokButton
                disabled={isDeletingVariant}
                onClick={() => void confirmVariantDeletion()}
                variant="outline"
              >
                {isDeletingVariant
                  ? 'Working…'
                  : deleteState.historyBlocked
                    ? 'Deactivate Variant'
                    : 'Delete Variant'}
              </KisokButton>
            </KisokDialogFooter>
          </KisokDialogContent>
        </KisokDialog>
      ) : null}
      {mediaVariant ? (
        <KisokDialog
          onOpenChange={(open) => {
            if (!open) setMediaVariant(null);
          }}
          open
        >
          <KisokDialogContent className="max-w-5xl">
            <KisokDialogHeader>
              <KisokDialogTitle>Variant Media · {mediaVariant.sku}</KisokDialogTitle>
              <KisokDialogDescription>
                Attach existing Media, upload a new asset, reorder, or choose the primary image for
                this Variant.
              </KisokDialogDescription>
            </KisokDialogHeader>
            <VariantMediaPicker variantId={mediaVariant.id} />
          </KisokDialogContent>
        </KisokDialog>
      ) : null}
    </section>
  );
}
