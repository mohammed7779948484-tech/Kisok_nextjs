'use client';

import { useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { CircleCheckIcon, XIcon } from 'lucide-react';

import { MediaPickerDialog } from '@/features/media-library/components/MediaPickerDialog';
import { VariantMediaPicker } from '@/features/media-library/components/VariantMediaPicker';
import { useMediaUpload } from '@/features/media-library/hooks/useMediaUpload';
import { Link } from '@/i18n/navigation';
import { useConfirmLeave } from '@/shared/navigation/UnsavedChangesGuard';
import {
  KisokButton,
  KisokDialog,
  KisokDialogContent,
  KisokDialogDescription,
  KisokDialogHeader,
  KisokDialogTitle,
} from '@/shared/ui';

import { useProductEditorWorkflow } from '../../hooks/useProductEditorWorkflow';
import { useVariantDeletion } from '../../hooks/useVariantDeletion';
import { productCatalogRepository } from '../../repositories';
import type { VariantRecord } from '../../types';
import { VariantFormDialog } from '../VariantFormDialog';
import { VariantOptionsDialog } from '../VariantOptionsDialog';
import { ProductBasicsTab } from './ProductBasicsTab';
import { ProductClassificationSection } from './ProductClassificationSection';
import { ProductCoverMediaField } from './ProductCoverMediaField';
import { ProductDeleteVariantDialog } from './ProductDeleteVariantDialog';
import { ProductEditorHeader } from './ProductEditorHeader';
import { type ProductEditorTab, ProductEditorTabs } from './ProductEditorTabs';
import { ProductVariantsTab } from './ProductVariantsTab';
import { ProductVisibilityPanel } from './ProductVisibilityPanel';

type EditorMode = 'create' | 'edit' | 'show';
type VariantDialogState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; variant: VariantRecord };

function getLoadError(
  mode: EditorMode,
  data: ReturnType<typeof useProductEditorWorkflow>['data'],
): string | null {
  if (data.references.status === 'error') return data.references.error.message;
  if (mode !== 'create' && data.product.status === 'error') return data.product.error.message;
  if (mode !== 'create' && data.categoryIds.status === 'error')
    return data.categoryIds.error.message;
  return null;
}

export function ProductEditorPage({ mode, productId }: { mode: EditorMode; productId?: string }) {
  const queryClient = useQueryClient();
  const workflow = useProductEditorWorkflow({ mode, productId });
  const confirmLeave = useConfirmLeave();
  const { upload, uploading, error: uploadError } = useMediaUpload();
  const [activeTab, setActiveTab] = useState<ProductEditorTab>('details');
  const [customNotice, setCustomNotice] = useState<string | null>(null);
  const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false);
  const [variantDialog, setVariantDialog] = useState<VariantDialogState>({ open: false });
  const [optionsVariant, setOptionsVariant] = useState<VariantRecord | null>(null);
  const [mediaVariant, setMediaVariant] = useState<VariantRecord | null>(null);
  const variantDeletion = useVariantDeletion({
    onCompleted: async () => {
      await workflow.data.refetchVariants();
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory_adjustments'] });
      setCustomNotice('Variant deleted successfully.');
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('toast') === 'created') {
      setCustomNotice(
        'Product draft created successfully. You can now add and configure Variants.',
      );
    }
    if (params.get('tab') === 'variants') {
      setActiveTab('variants');
    }
  }, []);

  const loadError = getLoadError(mode, workflow.data);
  const isLoading =
    workflow.data.references.status === 'loading' ||
    (mode !== 'create' &&
      (workflow.data.product.status === 'loading' ||
        workflow.data.categoryIds.status === 'loading'));
  const currentProductId = mode === 'create' ? undefined : productId;

  async function refreshVariants() {
    await workflow.data.refetchVariants();
  }

  return (
    <section className="rounded-2xl border border-border bg-card/90 p-4 text-card-foreground shadow-panel sm:p-7">
      <ProductEditorHeader
        isReadOnly={workflow.isReadOnly}
        isSaving={workflow.isSaving}
        mode={mode}
        onLeave={workflow.leaveEditor}
        onSave={(target) => void workflow.save(target)}
        productId={productId}
        productName={workflow.data.product.data?.name}
        saveDisabled={!workflow.canSave}
      />

      {isLoading ? (
        <p className="mt-6 text-muted-foreground text-sm" role="status">
          Loading Product context…
        </p>
      ) : null}
      {loadError ? (
        <div className="mt-6 grid gap-3" role="alert">
          <p className="text-destructive text-sm">{loadError}</p>
          <KisokButton
            className="w-fit"
            onClick={() => void workflow.data.refetch()}
            type="button"
            variant="outline"
          >
            Retry loading Product context
          </KisokButton>
        </div>
      ) : null}
      {workflow.saveError || uploadError || variantDeletion.error ? (
        <div className="mt-6 grid gap-3" role="alert">
          <p className="text-destructive text-sm">
            {workflow.saveError ?? uploadError ?? variantDeletion.error}
          </p>
          {workflow.recoveryDraftId ? (
            <Link
              href={`/admin/products/${workflow.recoveryDraftId}/edit`}
              onClick={(event) => {
                if (!confirmLeave()) event.preventDefault();
              }}
            >
              <KisokButton type="button" variant="outline">
                Open saved draft
              </KisokButton>
            </Link>
          ) : null}
        </div>
      ) : null}
      {workflow.saveMessage || customNotice ? (
        <div
          className="mt-6 flex items-center justify-between rounded-xl border border-success/30 bg-success/10 p-4 text-success"
          role="status"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <CircleCheckIcon aria-hidden="true" className="size-4 shrink-0" />
            <span>{workflow.saveMessage ?? customNotice}</span>
          </div>
          <button
            aria-label="Dismiss notice"
            className="text-muted-foreground hover:text-foreground cursor-pointer text-xs"
            onClick={() => {
              setCustomNotice(null);
            }}
            type="button"
          >
            <XIcon aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : null}

      {!(isLoading || loadError) && workflow.data.references.status === 'ready' ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <ProductEditorTabs
            activeTab={activeTab}
            details={
              <div className="grid gap-6">
                <ProductBasicsTab
                  canToggleActivation={workflow.canToggleActivation}
                  form={workflow.form}
                  isReadOnly={workflow.isReadOnly}
                  mode={mode}
                />
                <ProductClassificationSection
                  brands={workflow.data.references.brands}
                  categories={workflow.data.references.categories}
                  form={workflow.form}
                  isReadOnly={workflow.isReadOnly}
                />
                <ProductCoverMediaField
                  asset={workflow.selectedCover}
                  disabled={workflow.isReadOnly}
                  onChoose={() => setIsCoverPickerOpen(true)}
                  onRemove={() =>
                    workflow.form.setValue('coverMediaAssetId', null, { shouldDirty: true })
                  }
                  productName={workflow.values.name}
                />
              </div>
            }
            onTabChange={setActiveTab}
            variants={
              <ProductVariantsTab
                onAddVariant={() => setVariantDialog({ mode: 'create', open: true })}
                onDeleteVariant={variantDeletion.begin}
                onEditVariant={(variant) => setVariantDialog({ mode: 'edit', open: true, variant })}
                onMedia={setMediaVariant}
                onOptions={setOptionsVariant}
                onRetryVariants={() => void workflow.data.refetchVariants()}
                productId={currentProductId}
                readOnly={workflow.isReadOnly}
                variantEligibilityById={workflow.data.variantEligibilityById}
                variantMediaCounts={workflow.data.variantMediaCounts}
                variantMediaStatus={workflow.data.variantMedia.status}
                variantOptionsById={workflow.data.variantOptions.byVariantId}
                variantOptionsStatus={workflow.data.variantOptions.status}
                variants={workflow.data.variants.data}
                variantsError={workflow.data.variants.error}
                variantsStatus={workflow.data.variants.status}
              />
            }
          />
          <ProductVisibilityPanel
            categoriesCount={workflow.selectedCategories.length}
            hasCover={workflow.selectedCover !== null}
            isActive={workflow.values.isActive}
            variantsCount={workflow.data.variants.data.length}
            visibility={workflow.visibility}
          />
        </div>
      ) : null}

      <MediaPickerDialog
        isUploading={uploading}
        onOpenChange={setIsCoverPickerOpen}
        onRetry={() => void workflow.data.refetch()}
        onSelect={(asset) =>
          workflow.form.setValue('coverMediaAssetId', asset.id, { shouldDirty: true })
        }
        onUpload={upload}
        open={isCoverPickerOpen}
        selectedAssetId={workflow.values.coverMediaAssetId}
      />

      {variantDialog.open && variantDialog.mode === 'create' && currentProductId ? (
        <VariantFormDialog
          mode="create"
          onCreate={async (input) => {
            await productCatalogRepository.createVariant(input);
            await refreshVariants();
            void queryClient.invalidateQueries({ queryKey: ['products'] });
            void queryClient.invalidateQueries({ queryKey: ['inventory'] });
            if (input.initialQuantity > 0) {
              void queryClient.invalidateQueries({ queryKey: ['inventory_adjustments'] });
            }
            setCustomNotice('Variant created successfully.');
          }}
          onOpenChange={(open) => {
            if (!open) setVariantDialog({ open: false });
          }}
          open
          productId={currentProductId}
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
            setCustomNotice('Variant updated successfully.');
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
          onSaved={() => {
            void workflow.data.refetchVariantOptions();
            setCustomNotice('Variant options saved successfully.');
          }}
          open
          optionTypes={workflow.data.references.optionTypes}
          siblingVariants={workflow.data.variants.data
            .filter((variant) => variant.id !== optionsVariant.id)
            .map((variant) => ({ id: variant.id, sku: variant.sku }))}
          variantId={optionsVariant.id}
          variantLabel={optionsVariant.sku}
        />
      ) : null}
      <ProductDeleteVariantDialog
        historyBlocked={variantDeletion.historyBlocked}
        isWorking={variantDeletion.isWorking}
        onCancel={variantDeletion.cancel}
        onConfirm={() => void variantDeletion.confirm()}
        variant={variantDeletion.variant}
      />
      {mediaVariant ? (
        <KisokDialog onOpenChange={(open) => !open && setMediaVariant(null)} open>
          <KisokDialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-4 p-5 sm:max-w-4xl sm:p-6">
            <KisokDialogHeader className="border-border border-b pb-3">
              <KisokDialogTitle className="font-bold text-xl">
                Variant Media · {mediaVariant.sku}
              </KisokDialogTitle>
              <KisokDialogDescription className="text-muted-foreground text-xs sm:text-sm">
                Attach existing Media, upload a new asset, reorder it, or choose the primary image
                for this Variant.
              </KisokDialogDescription>
            </KisokDialogHeader>
            <VariantMediaPicker variantId={mediaVariant.id} />
          </KisokDialogContent>
        </KisokDialog>
      ) : null}
    </section>
  );
}
