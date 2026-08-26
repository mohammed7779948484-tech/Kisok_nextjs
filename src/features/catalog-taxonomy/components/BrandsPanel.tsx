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
import { BRANDS_PAGE_SIZE, useBrandsList } from '../hooks/useBrandsList';
import { type BrandFormValues, brandFormDefaultValues } from '../schemas/brand.schema';
import type { BrandRecord } from '../types';

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
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    refineCore: { onFinish },
  } = useBrandForm({ id: brand?.id, mode });

  useEffect(() => {
    if (!open) return;
    reset(brand ? { name: brand.name, is_active: brand.isActive } : brandFormDefaultValues);
  }, [open, brand, reset]);

  async function onSubmit(values: BrandFormValues) {
    await onFinish(values);
    onOpenChange(false);
  }

  return (
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
            <KisokInput aria-invalid={Boolean(errors.name)} id="brand-name" {...register('name')} />
            {errors.name ? <p className="text-destructive text-sm">{errors.name.message}</p> : null}
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
  const [dialogState, setDialogState] = useState<DialogState>({ mode: 'create', open: false });

  const totalPages = Math.max(1, Math.ceil(total / BRANDS_PAGE_SIZE));

  function toggleActive(brand: BrandRecord) {
    updateBrand({ id: brand.id, resource: 'brands', values: { is_active: !brand.isActive } });
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.map((brand) => (
              <TableRow key={brand.id}>
                <TableCell className="font-medium">{brand.name}</TableCell>
                <TableCell>
                  <StatusPill
                    className={brand.isActive ? undefined : 'border-destructive text-destructive'}
                  >
                    {brand.isActive ? 'Active' : 'Inactive'}
                  </StatusPill>
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground text-xs">
                  {brand.displayOrder}
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
    </section>
  );
}
