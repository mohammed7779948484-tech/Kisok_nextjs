'use client';

import { useEffect, useState } from 'react';

import { useUpdate } from '@refinedev/core';
import { Controller } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MediaPickerDialog } from '@/features/media-library/components/MediaPickerDialog';
import { useMediaUpload } from '@/features/media-library/hooks/useMediaUpload';
import type { MediaAssetRecord } from '@/features/media-library/types';
import {
  KisokButton,
  KisokDialog,
  KisokDialogContent,
  KisokDialogDescription,
  KisokDialogFooter,
  KisokDialogHeader,
  KisokDialogTitle,
  KisokInput,
  StatusPill,
} from '@/shared/ui';

import { useBrandForm } from '../hooks/useBrandForm';
import { useBrandReorder } from '../hooks/useBrandReorder';
import { BRANDS_PAGE_SIZE, useBrandsList } from '../hooks/useBrandsList';
import { formatDisplayRank } from '../lib/reorder';
import { type BrandFormValues, brandFormDefaultValues } from '../schemas/brand.schema';
import type { BrandRecord } from '../types';
import { ConfirmActionDialog } from './ConfirmActionDialog';
import { ReorderButtonGroup } from './ReorderButtonGroup';

/** Debounced-as-you-type search: one deliberate pattern, not a live-effect
 * search plus a redundant "Search" button. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

type DialogState = { open: boolean; mode: 'create' | 'edit'; brand?: BrandRecord };

function BrandFormDialog({
  dialogState,
  onOpenChange,
}: {
  dialogState: DialogState;
  onOpenChange: (open: boolean) => void;
}) {
  const { mode, brand, open } = dialogState;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const { upload, uploading, error: uploadError } = useMediaUpload();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    refineCore: { onFinish },
  } = useBrandForm({ id: brand?.id, mode });

  const currentMediaAssetId = watch('image_media_asset_id');

  useEffect(() => {
    if (!open) return;
    if (brand) {
      reset({
        name: brand.name,
        is_active: brand.isActive,
        image_media_asset_id: brand.imageMediaAssetId,
      });
      setSelectedImageUrl(brand.imageUrl ?? null);
    } else {
      reset(brandFormDefaultValues);
      setSelectedImageUrl(null);
    }
  }, [open, brand, reset]);

  async function onSubmit(values: BrandFormValues) {
    await onFinish(values);
    onOpenChange(false);
  }

  function handleSelectMedia(asset: MediaAssetRecord) {
    setValue('image_media_asset_id', asset.id, { shouldDirty: true });
    setSelectedImageUrl(asset.secureUrl);
  }

  function handleRemoveMedia() {
    setValue('image_media_asset_id', null, { shouldDirty: true });
    setSelectedImageUrl(null);
  }

  return (
    <>
      <KisokDialog onOpenChange={onOpenChange} open={open}>
        <KisokDialogContent>
          <KisokDialogHeader>
            <KisokDialogTitle>{mode === 'create' ? 'Add Brand' : 'Edit Brand'}</KisokDialogTitle>
            <KisokDialogDescription>
              {mode === 'create'
                ? 'Create a reusable Brand in the hosted catalog.'
                : 'Update this Brand. Products already using it keep their reference.'}
            </KisokDialogDescription>
          </KisokDialogHeader>
          <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <Label htmlFor="brand-name">Brand name</Label>
              <KisokInput
                aria-invalid={Boolean(errors.name)}
                id="brand-name"
                {...register('name')}
              />
              {errors.name ? (
                <p className="text-destructive text-sm">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>Brand logo</Label>
              <div className="flex items-center gap-3">
                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted">
                  {selectedImageUrl ? (
                    <img
                      alt="Brand logo preview"
                      className="h-full w-full object-cover"
                      src={selectedImageUrl}
                    />
                  ) : (
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      No logo
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <KisokButton
                    onClick={() => setPickerOpen(true)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {selectedImageUrl ? 'Change logo' : 'Choose from library'}
                  </KisokButton>
                  {selectedImageUrl ? (
                    <KisokButton
                      onClick={handleRemoveMedia}
                      size="sm"
                      type="button"
                      variant="quiet"
                    >
                      Remove logo
                    </KisokButton>
                  ) : null}
                </div>
              </div>
            </div>

            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={field.value}
                    id="brand-active"
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                  <Label htmlFor="brand-active">Active</Label>
                </div>
              )}
            />
            <KisokDialogFooter>
              <KisokButton
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}
                type="button"
                variant="quiet"
              >
                Cancel
              </KisokButton>
              <KisokButton disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Saving…' : 'Save brand'}
              </KisokButton>
            </KisokDialogFooter>
          </form>
        </KisokDialogContent>
      </KisokDialog>

      <MediaPickerDialog
        description="Choose an existing image, upload a new one, or capture a photo for this brand logo."
        isUploading={uploading}
        error={uploadError}
        onOpenChange={setPickerOpen}
        onSelect={handleSelectMedia}
        onUpload={upload}
        open={pickerOpen}
        selectedAssetId={currentMediaAssetId ?? null}
        title="Select Brand Logo"
      />
    </>
  );
}

export function BrandsPanel() {
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const { brands, total, isLoading, isError, refetch } = useBrandsList({
    page,
    search: debouncedSearch,
  });
  const { mutate: updateBrand } = useUpdate();
  const { move: moveBrand, isReordering } = useBrandReorder(() => void refetch());
  const [dialogState, setDialogState] = useState<DialogState>({ mode: 'create', open: false });
  const [deactivateTarget, setDeactivateTarget] = useState<BrandRecord | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / BRANDS_PAGE_SIZE));

  function toggleActive(brand: BrandRecord) {
    if (brand.isActive) {
      setDeactivateTarget(brand);
      return;
    }
    updateBrand({ id: brand.id, resource: 'brands', values: { is_active: true } });
  }

  function confirmDeactivate() {
    if (!deactivateTarget) return;
    updateBrand({
      id: deactivateTarget.id,
      resource: 'brands',
      values: { is_active: false },
    });
    setDeactivateTarget(null);
  }

  return (
    <section className="border border-border bg-card p-5 text-card-foreground sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.2em]">
            Catalog taxonomy / hosted data
          </p>
          <h1 className="mt-2 font-black text-5xl tracking-[-0.08em] sm:text-6xl">Brands</h1>
        </div>
        <div className="flex gap-2">
          <KisokButton
            onClick={() => setDialogState({ mode: 'create', open: true })}
            variant="outline"
          >
            Add brand
          </KisokButton>
          <KisokButton onClick={() => void refetch()} variant="outline">
            Refresh
          </KisokButton>
        </div>
      </div>

      <div className="mt-6">
        <Label className="sr-only" htmlFor="brand-search">
          Search brands
        </Label>
        <KisokInput
          id="brand-search"
          onChange={(event) => {
            setSearchInput(event.target.value);
            setPage(1);
          }}
          placeholder="Search brands"
          value={searchInput}
        />
      </div>

      {isLoading ? (
        <p className="mt-6 text-muted-foreground text-sm" role="status">
          Loading brands…
        </p>
      ) : isError ? (
        <div className="mt-6 grid gap-3" role="alert">
          <p className="text-destructive text-sm">
            Brands could not be loaded. Check the connection and try again.
          </p>
          <KisokButton onClick={() => void refetch()} variant="outline">
            Try again
          </KisokButton>
        </div>
      ) : brands.length === 0 ? (
        <p className="mt-6 text-muted-foreground text-sm">No brands match this search.</p>
      ) : (
        <Table className="mt-6">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Order</TableHead>
              <TableHead className="text-right">Reorder</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.map((brand, index) => (
              <TableRow key={brand.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    {brand.imageUrl ? (
                      <img
                        alt={brand.name}
                        className="size-8 shrink-0 rounded-md border border-border object-cover bg-muted"
                        src={brand.imageUrl}
                      />
                    ) : (
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted font-mono text-[11px] font-semibold text-muted-foreground uppercase">
                        {brand.name.slice(0, 2)}
                      </div>
                    )}
                    <span>{brand.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusPill
                    className={brand.isActive ? undefined : 'border-destructive text-destructive'}
                  >
                    {brand.isActive ? 'Active' : 'Inactive'}
                  </StatusPill>
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground text-xs">
                  {formatDisplayRank((page - 1) * BRANDS_PAGE_SIZE + index)}
                </TableCell>
                <TableCell className="text-right">
                  <ReorderButtonGroup
                    hasActiveSearch={Boolean(debouncedSearch.trim())}
                    isFirst={(page - 1) * BRANDS_PAGE_SIZE + index === 0}
                    isLast={(page - 1) * BRANDS_PAGE_SIZE + index === total - 1}
                    isReordering={isReordering}
                    itemName={brand.name}
                    onMoveDown={() => void moveBrand(brand, 'down')}
                    onMoveUp={() => void moveBrand(brand, 'up')}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <KisokButton
                    onClick={() => setDialogState({ brand, mode: 'edit', open: true })}
                    size="sm"
                    variant="quiet"
                  >
                    Edit
                  </KisokButton>
                  <KisokButton
                    aria-label={`${brand.isActive ? 'Deactivate' : 'Activate'} ${brand.name}`}
                    onClick={() => toggleActive(brand)}
                    size="sm"
                    variant="quiet"
                  >
                    {brand.isActive ? 'Deactivate' : 'Activate'}
                  </KisokButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {totalPages > 1 ? (
        <Pagination className="mt-6 justify-start">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <PaginationItem key={pageNumber}>
                <PaginationLink isActive={pageNumber === page} onClick={() => setPage(pageNumber)}>
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                aria-disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}

      <BrandFormDialog
        dialogState={dialogState}
        onOpenChange={(open) => setDialogState((current) => ({ ...current, open }))}
      />

      <ConfirmActionDialog
        confirmLabel="Deactivate"
        description={`Deactivating ${deactivateTarget?.name ?? 'this brand'} may hide Products/Variants that depend on it from customers. Continue?`}
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={confirmDeactivate}
        open={deactivateTarget !== null}
        title={`Deactivate ${deactivateTarget?.name ?? 'Brand'}`}
      />
    </section>
  );
}
