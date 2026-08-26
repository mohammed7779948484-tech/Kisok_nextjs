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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

/** Debounced-as-you-type search — same pattern as `BrandsPanel`. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

const ROOT_PARENT_VALUE = '__root__';

type DialogState = { open: boolean; mode: 'create' | 'edit'; category?: CategoryRecord };

function CategoryFormDialog({
  dialogState,
  onOpenChange,
  rootCategories,
}: {
  dialogState: DialogState;
  onOpenChange: (open: boolean) => void;
  rootCategories: CategoryRecord[];
}) {
  const { mode, category, open } = dialogState;
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    refineCore: { onFinish },
  } = useCategoryForm({ id: category?.id, mode });

  useEffect(() => {
    if (!open) return;
    reset(
      category
        ? { name: category.name, parent_id: category.parentId, is_active: category.isActive }
        : categoryFormDefaultValues,
    );
  }, [open, category, reset]);

  async function onSubmit(values: CategoryFormValues) {
    await onFinish(values);
    onOpenChange(false);
  }

  const parentOptions = rootCategories.filter((candidate) => candidate.id !== category?.id);

  return (
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
            {errors.name ? <p className="text-destructive text-sm">{errors.name.message}</p> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category-parent">Parent category</Label>
            <Controller
              control={control}
              name="parent_id"
              render={({ field }) => (
                <Select
                  onValueChange={(value) =>
                    field.onChange(value === ROOT_PARENT_VALUE ? null : value)
                  }
                  value={field.value ?? ROOT_PARENT_VALUE}
                >
                  <SelectTrigger id="category-parent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ROOT_PARENT_VALUE}>Root category</SelectItem>
                    {parentOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
  const { categories: rootCategories } = useCategoriesList({
    page: 1,
    search: '',
    parentId: null,
    pageSize: 200,
  });
  const { mutate: updateCategory } = useUpdate();
  const { move: moveCategory } = useCategoryReorder(() => void refetch());
  const [dialogState, setDialogState] = useState<DialogState>({ mode: 'create', open: false });

  const totalPages = Math.max(1, Math.ceil(total / CATEGORIES_PAGE_SIZE));

  function toggleActive(category: CategoryRecord) {
    updateCategory({
      id: category.id,
      resource: 'categories',
      values: { is_active: !category.isActive },
    });
  }

  return (
    <section className="border border-border bg-card p-5 text-card-foreground sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
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
                <TableCell className={category.parentId ? 'pl-8 font-medium' : 'font-medium'}>
                  {category.name}
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
                    onClick={() => void moveCategory(category, 'up')}
                    size="sm"
                    variant="quiet"
                  >
                    ▲
                  </KisokButton>
                  <KisokButton
                    aria-label={`Move ${category.name} down`}
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
        rootCategories={rootCategories}
      />
    </section>
  );
}
