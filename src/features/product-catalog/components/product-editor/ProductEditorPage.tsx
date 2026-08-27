'use client';

import { useState } from 'react';

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
  const workflow = useProductEditorWorkflow({ mode, productId });
  const confirmLeave = useConfirmLeave();
  const { upload, uploading, error: uploadError } = useMediaUpload();
  const [activeTab, setActiveTab] = useState<ProductEditorTab>('details');
  const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false);
  const [variantDialog, setVariantDialog] = useState<VariantDialogState>({ open: false });
  const [optionsVariant, setOptionsVariant] = useState<VariantRecord | null>(null);
  const [mediaVariant, setMediaVariant] = useState<VariantRecord | null>(null);
  const variantDeletion = useVariantDeletion({
    onCompleted: async () => {
      await workflow.data.refetchVariants();
    },
  });

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
    <section className="border border-border bg-card p-5 text-card-foreground sm:p-7">
      <ProductEditorHeader
        isReadOnly={workflow.isReadOnly}
        isSaving={workflow.isSaving}
        mode={mode}
        onLeave={workflow.leaveEditor}
        onSave={() => void workflow.save()}
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
      {workflow.saveMessage ? (
        <p className="mt-6 text-sm text-foreground" role="status">
          {workflow.saveMessage}
        </p>
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
                productId={currentProductId}
                readOnly={workflow.isReadOnly}
                variantMediaCounts={workflow.data.variantMediaCounts}
                variantEligibilityById={workflow.data.variantEligibilityById}
                variantOptionsById={workflow.data.variantOptions.byVariantId}
                variants={workflow.data.variants.data}
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
          onSaved={() => void workflow.data.refetchVariantOptions()}
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
          <KisokDialogContent className="max-w-5xl">
            <KisokDialogHeader>
              <KisokDialogTitle>Variant Media · {mediaVariant.sku}</KisokDialogTitle>
              <KisokDialogDescription>
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
