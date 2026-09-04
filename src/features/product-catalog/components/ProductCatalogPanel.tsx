'use client';

import { useEffect, useState } from 'react';

import { CircleCheckIcon, XIcon } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmActionDialog } from '@/features/catalog-taxonomy/components/ConfirmActionDialog';
import { Link } from '@/i18n/navigation';
import { CompactPagination, KisokButton, KisokInput, StatusPill } from '@/shared/ui';

import { useProductsList } from '../hooks/useProductsList';
import { productCatalogRepository } from '../repositories';
import type { ProductRecord } from '../types';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, value]);
  return debounced;
}

export function ProductCatalogPanel() {
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ProductRecord | null>(null);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const { products, total, pageSize, isLoading, isError, refetch } = useProductsList({
    page,
    search: debouncedSearch,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const toastType = params.get('toast');
    const name = params.get('name');
    if (toastType === 'created') {
      setNotice(
        name
          ? `Product "${name}" was created successfully.`
          : 'Product draft was created successfully.',
      );
      window.history.replaceState({}, '', window.location.pathname);
    } else if (toastType === 'updated') {
      setNotice(
        name
          ? `Product "${name}" was updated successfully.`
          : 'Product changes were saved successfully.',
      );
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    await productCatalogRepository.updateProduct(deactivateTarget.id, { isActive: false });
    setDeactivateTarget(null);
    await refetch();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="rounded-2xl border border-border bg-card/90 p-4 text-card-foreground shadow-panel sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
            Product catalog / hosted data
          </p>
          <h1 className="mt-2 text-balance font-black text-4xl tracking-[-0.05em] sm:text-5xl">
            Product catalog
          </h1>
        </div>
        <div className="flex gap-2">
          <Link className={buttonVariants()} href="/admin/products/create">
            New product
          </Link>
          <KisokButton onClick={() => void refetch()} variant="outline">
            Refresh
          </KisokButton>
        </div>
      </div>

      {notice ? (
        <div
          className="mt-6 flex items-center justify-between rounded-xl border border-success/30 bg-success/10 p-4 text-success"
          role="status"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <CircleCheckIcon aria-hidden="true" className="size-4 shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            aria-label="Dismiss notice"
            className="cursor-pointer text-muted-foreground text-xs hover:text-foreground"
            onClick={() => setNotice(null)}
            type="button"
          >
            <XIcon aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : null}

      <div className="mt-6 max-w-lg">
        <label className="sr-only" htmlFor="product-search">
          Search products
        </label>
        <KisokInput
          id="product-search"
          onChange={(event) => {
            setSearchInput(event.target.value);
            setPage(1);
          }}
          placeholder="Search product, brand, SKU, or barcode…"
          value={searchInput}
        />
      </div>

      {isLoading ? (
        <p className="mt-6 text-muted-foreground text-sm" role="status">
          Loading products…
        </p>
      ) : isError ? (
        <div className="mt-6 grid gap-3" role="alert">
          <p className="text-destructive text-sm">
            Products could not be loaded. Check the connection and try again.
          </p>
          <KisokButton onClick={() => void refetch()} variant="outline">
            Try again
          </KisokButton>
        </div>
      ) : products.length === 0 ? (
        debouncedSearch.trim() ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/25 px-5 py-14 text-center">
            <p className="font-semibold text-foreground text-sm">No products match your search</p>
            <p className="mt-1 text-muted-foreground text-xs">
              No products match &ldquo;{debouncedSearch}&rdquo;. Try adjusting your search keywords.
            </p>
            <KisokButton
              className="mt-4"
              onClick={() => {
                setSearchInput('');
                setPage(1);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              Clear search
            </KisokButton>
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/25 px-5 py-14 text-center">
            <p className="font-semibold text-foreground text-sm">No products in catalog</p>
            <p className="mt-1 text-muted-foreground text-xs">
              Get started by creating your first product.
            </p>
            <Link
              className={buttonVariants({ className: 'mt-4', size: 'sm' })}
              href="/admin/products/create"
            >
              Add first product
            </Link>
          </div>
        )
      ) : (
        <div className="mt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Variants</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-bold break-words">{product.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {product.brandName ?? 'Unassigned'}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground text-sm">
                    {product.variantCount}
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={product.isActive ? 'success' : 'destructive'}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        aria-label={`View ${product.name}`}
                        className={buttonVariants({ size: 'sm', variant: 'quiet' })}
                        href={`/admin/products/${product.id}`}
                      >
                        View
                      </Link>
                      <Link
                        aria-label={`Edit ${product.name}`}
                        className={buttonVariants({ size: 'sm', variant: 'quiet' })}
                        href={`/admin/products/${product.id}/edit`}
                      >
                        Edit
                      </Link>
                      {product.isActive ? (
                        <KisokButton
                          aria-label={`Deactivate ${product.name}`}
                          onClick={() => setDeactivateTarget(product)}
                          size="sm"
                          variant="quiet"
                        >
                          Deactivate
                        </KisokButton>
                      ) : (
                        <Link
                          aria-label={`Review readiness ${product.name}`}
                          className={buttonVariants({ size: 'sm', variant: 'quiet' })}
                          href={`/admin/products/${product.id}/edit`}
                        >
                          Review readiness
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 ? (
        <CompactPagination
          className="mt-6 justify-start"
          onPageChange={setPage}
          page={page}
          totalPages={totalPages}
        />
      ) : null}

      <ConfirmActionDialog
        confirmLabel="Deactivate"
        description={`Deactivating "${deactivateTarget?.name ?? 'this product'}" will hide all of its variants from customer storefronts. Active orders will not be affected. Continue?`}
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={() => void confirmDeactivate()}
        open={deactivateTarget !== null}
        title={`Deactivate ${deactivateTarget?.name ?? 'Product'}`}
      />
    </section>
  );
}
