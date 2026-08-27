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

import { CATEGORIES_PAGE_SIZE, useCategoriesList } from '../hooks/useCategoriesList';
import { useCategoryForm } from '../hooks/useCategoryForm';
import { useCategoryReorder } from '../hooks/useCategoryReorder';
import { type CategoryFormValues, categoryFormDefaultValues } from '../schemas/category.schema';
import type { CategoryRecord } from '../types';
import { ConfirmActionDialog } from './ConfirmActionDialog';

/** Debounced-as-you-type search — same pattern as `BrandsPanel`. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

type DialogState = { open: boolean; mode: 'create' | 'edit'; category?: CategoryRecord };

function CategoryFormDialog({
  dialogState,
  onOpenChange,
}: {
  dialogState: DialogState;
  onOpenChange: (open: boolean) => void;
}) {
  const { mode, category, open } = dialogState;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const { upload, uploading, error: uploadError } = useMediaUpload();
  const [parentSearchInput, setParentSearchInput] = useState('');
  const debouncedParentSearch = useDebouncedValue(parentSearchInput, 300);
  const {
    categories: rootCategoryMatches,
    isLoading: parentCategoriesLoading,
    isError: parentCategoriesError,
    refetch: refetchParentCategories,
  } = useCategoriesList({
    page: 1,
    search: debouncedParentSearch,
    parentId: null,
    pageSize: CATEGORIES_PAGE_SIZE,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    refineCore: { onFinish },
  } = useCategoryForm({ id: category?.id, mode });

  const currentMediaAssetId = watch('image_media_asset_id');

  useEffect(() => {
    if (!open) return;
    if (category) {
      reset({
        name: category.name,
        parent_id: category.parentId,
        is_active: category.isActive,
        image_media_asset_id: category.imageMediaAssetId,
      });
      setSelectedImageUrl(category.imageUrl ?? null);
    } else {
      reset(categoryFormDefaultValues);
      setSelectedImageUrl(null);
    }
  }, [open, category, reset]);

  async function onSubmit(values: CategoryFormValues) {
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

  const parentOptions = rootCategoryMatches.filter((candidate) => candidate.id !== category?.id);

  return (
    <>
      <KisokDialog onOpenChange={onOpenChange} open={open}>
        <KisokDialogContent>
          <KisokDialogHeader>
            <KisokDialogTitle>
              {mode === 'create' ? 'Add Category' : 'Edit Category'}
            </KisokDialogTitle>
            <KisokDialogDescription>
              Categories support one root level and one child level in the hosted Lean V2 catalog.
            </KisokDialogDescription>
          </KisokDialogHeader>
          <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <Label htmlFor="category-name">Category name</Label>
              <KisokInput
                aria-invalid={Boolean(errors.name)}
                id="category-name"
                {...register('name')}
              />
              {errors.name ? (
                <p className="text-destructive text-sm">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>Category image</Label>
              <div className="flex items-center gap-3">
                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted">
                  {selectedImageUrl ? (
                    <img
                      alt="Category preview"
                      className="h-full w-full object-cover"
                      src={selectedImageUrl}
                    />
                  ) : (
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      No image
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
                    {selectedImageUrl ? 'Change image' : 'Choose from library'}
                  </KisokButton>
                  {selectedImageUrl ? (
                    <KisokButton
                      onClick={handleRemoveMedia}
                      size="sm"
                      type="button"
                      variant="quiet"
                    >
                      Remove image
                    </KisokButton>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category-parent-search">Parent category</Label>
              <KisokInput
                id="category-parent-search"
                onChange={(event) => setParentSearchInput(event.target.value)}
                placeholder="Search parent categories"
                value={parentSearchInput}
              />
              <Controller
                control={control}
                name="parent_id"
                render={({ field }) =>
                  parentCategoriesLoading ? (
                    <p className="text-muted-foreground text-sm" role="status">
                      Loading parent categories…
                    </p>
                  ) : parentCategoriesError ? (
                    <div className="grid gap-2" role="alert">
                      <p className="text-destructive text-sm">
                        Parent categories could not be loaded.
                      </p>
                      <KisokButton
                        onClick={() => void refetchParentCategories()}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Try again
                      </KisokButton>
                    </div>
                  ) : (
                    <div
                      aria-label="Parent category"
                      className="grid max-h-48 gap-1 overflow-y-auto rounded-md border border-border p-1"
                      role="listbox"
                    >
                      <button
                        aria-selected={field.value === null}
                        className={
                          field.value === null
                            ? 'rounded-sm bg-muted px-2 py-1 text-left text-sm font-medium'
                            : 'rounded-sm px-2 py-1 text-left text-sm hover:bg-muted/60'
                        }
                        onClick={() => field.onChange(null)}
                        role="option"
                        type="button"
                      >
                        Root category
                      </button>
                      {parentOptions.map((option) => (
                        <button
                          aria-selected={field.value === option.id}
                          className={
                            field.value === option.id
                              ? 'rounded-sm bg-muted px-2 py-1 text-left text-sm font-medium'
                              : 'rounded-sm px-2 py-1 text-left text-sm hover:bg-muted/60'
                          }
                          key={option.id}
                          onClick={() => field.onChange(option.id)}
                          role="option"
                          type="button"
                        >
                          {option.name}
                        </button>
                      ))}
                    </div>
                  )
                }
              />
            </div>
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={field.value}
                    id="category-active"
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                  <Label htmlFor="category-active">Active</Label>
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
                {isSubmitting ? 'Saving…' : 'Save category'}
              </KisokButton>
            </KisokDialogFooter>
          </form>
        </KisokDialogContent>
      </KisokDialog>

      <MediaPickerDialog
        description="Choose an existing image, upload a new one, or capture a photo for this category."
        isUploading={uploading}
        error={uploadError}
        onOpenChange={setPickerOpen}
        onSelect={handleSelectMedia}
        onUpload={upload}
        open={pickerOpen}
        selectedAssetId={currentMediaAssetId ?? null}
        title="Select Category Image"
      />
    </>
  );
}

export function CatalogTaxonomyPanel() {
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const { categories, total, isLoading, isError, refetch } = useCategoriesList({
    page,
    search: debouncedSearch,
  });
  const { mutate: updateCategory } = useUpdate();
  const { move: moveCategory, isReordering } = useCategoryReorder(() => void refetch());
  const [dialogState, setDialogState] = useState<DialogState>({ mode: 'create', open: false });
  const [deactivateTarget, setDeactivateTarget] = useState<CategoryRecord | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / CATEGORIES_PAGE_SIZE));

  function toggleActive(category: CategoryRecord) {
    if (category.isActive) {
      setDeactivateTarget(category);
      return;
    }
    updateCategory({
      id: category.id,
      resource: 'categories',
      values: { is_active: true },
    });
  }

  function confirmDeactivate() {
    if (!deactivateTarget) return;
    updateCategory({
      id: deactivateTarget.id,
      resource: 'categories',
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
          <h1 className="mt-2 font-black text-5xl tracking-[-0.08em] sm:text-6xl">Categories</h1>
        </div>
        <div className="flex gap-2">
          <KisokButton
            onClick={() => setDialogState({ mode: 'create', open: true })}
            variant="outline"
          >
            Add category
          </KisokButton>
          <KisokButton onClick={() => void refetch()} variant="outline">
            Refresh
          </KisokButton>
        </div>
      </div>

      <div className="mt-6">
        <Label className="sr-only" htmlFor="category-search">
          Search categories
        </Label>
        <KisokInput
          id="category-search"
          onChange={(event) => {
            setSearchInput(event.target.value);
            setPage(1);
          }}
          placeholder="Search categories"
          value={searchInput}
        />
      </div>

      {isLoading ? (
        <p className="mt-6 text-muted-foreground text-sm" role="status">
          Loading categories…
        </p>
      ) : isError ? (
        <div className="mt-6 grid gap-3" role="alert">
          <p className="text-destructive text-sm">
            Categories could not be loaded. Check the connection and try again.
          </p>
          <KisokButton onClick={() => void refetch()} variant="outline">
            Try again
          </KisokButton>
        </div>
      ) : categories.length === 0 ? (
        <p className="mt-6 text-muted-foreground text-sm">No categories match this search.</p>
      ) : (
        <Table className="mt-6">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Order</TableHead>
              <TableHead className="text-right">Reorder</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">
                  <div className={`flex items-center gap-3 ${category.parentId ? 'pl-6' : ''}`}>
                    {category.imageUrl ? (
                      <img
                        alt={category.name}
                        className="size-8 shrink-0 rounded-md border border-border object-cover bg-muted"
                        src={category.imageUrl}
                      />
                    ) : (
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted font-mono text-[11px] font-semibold text-muted-foreground uppercase">
                        {category.name.slice(0, 2)}
                      </div>
                    )}
                    <span>{category.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {category.parentId ? 'Child' : 'Root'}
                </TableCell>
                <TableCell>
                  <StatusPill
                    className={
                      category.isActive ? undefined : 'border-destructive text-destructive'
                    }
                  >
                    {category.isActive ? 'Active' : 'Inactive'}
                  </StatusPill>
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground text-xs">
                  {category.displayOrder}
                </TableCell>
                <TableCell className="text-right">
                  <KisokButton
                    aria-label={`Move ${category.name} up`}
                    disabled={isReordering}
                    onClick={() => void moveCategory(category, 'up')}
                    size="sm"
                    variant="quiet"
                  >
                    ▲
                  </KisokButton>
                  <KisokButton
                    aria-label={`Move ${category.name} down`}
                    disabled={isReordering}
                    onClick={() => void moveCategory(category, 'down')}
                    size="sm"
                    variant="quiet"
                  >
                    ▼
                  </KisokButton>
                </TableCell>
                <TableCell className="text-right">
                  <KisokButton
                    onClick={() => setDialogState({ category, mode: 'edit', open: true })}
                    size="sm"
                    variant="quiet"
                  >
                    Edit
                  </KisokButton>
                  <KisokButton
                    aria-label={`${category.isActive ? 'Deactivate' : 'Activate'} ${category.name}`}
                    onClick={() => toggleActive(category)}
                    size="sm"
                    variant="quiet"
                  >
                    {category.isActive ? 'Deactivate' : 'Activate'}
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

      <CategoryFormDialog
        dialogState={dialogState}
        onOpenChange={(open) => setDialogState((current) => ({ ...current, open }))}
      />

      <ConfirmActionDialog
        confirmLabel="Deactivate"
        description={`Deactivating ${deactivateTarget?.name ?? 'this category'} may hide Products/Variants that depend on it from customers. Continue?`}
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={confirmDeactivate}
        open={deactivateTarget !== null}
        title={`Deactivate ${deactivateTarget?.name ?? 'Category'}`}
      />
    </section>
  );
}
