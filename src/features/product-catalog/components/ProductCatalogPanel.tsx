'use client';

import { useEffect, useState } from 'react';

import { CircleCheckIcon } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
    } else if (toastType === 'updated') {
      setNotice(
        name
          ? `Product "${name}" was updated successfully.`
          : 'Product changes were saved successfully.',
      );
    }
  }, []);

  async function toggleActive(product: ProductRecord) {
    await productCatalogRepository.updateProduct(product.id, { isActive: !product.isActive });
    await refetch();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="border border-border bg-card p-5 text-card-foreground sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
            Product catalog / hosted data
          </p>
          <h1 className="mt-2 font-black text-5xl tracking-[-0.08em] sm:text-6xl">
            Product catalog
          </h1>
        </div>
        <div className="flex gap-2">
          <Link className={buttonVariants({ variant: 'outline' })} href="/admin/products/create">
            New product
          </Link>
          <KisokButton onClick={() => void refetch()} variant="outline">
            Refresh
          </KisokButton>
        </div>
      </div>

      {notice ? (
        <div
          className="mt-6 flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400"
          role="status"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <CircleCheckIcon className="size-4 shrink-0 text-emerald-400" />
            <span>{notice}</span>
          </div>
          <button
            aria-label="Dismiss notice"
            className="text-muted-foreground hover:text-foreground cursor-pointer text-xs"
            onClick={() => setNotice(null)}
            type="button"
          >
            ✕
          </button>
        </div>
      ) : null}

      <div className="mt-6">
        <label className="sr-only" htmlFor="product-search">
          Search products
        </label>
        <KisokInput
          id="product-search"
          onChange={(event) => {
            setSearchInput(event.target.value);
            setPage(1);
          }}
          placeholder="Search products"
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
        <p className="mt-6 text-muted-foreground text-sm">No products are available.</p>
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
                  <TableCell className="font-bold">{product.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {product.brandName ?? 'Unassigned'}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground text-sm">
                    {product.variantCount}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      className={
                        product.isActive ? undefined : 'border-destructive text-destructive'
                      }
                    >
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
                          onClick={() => void toggleActive(product)}
                          size="sm"
                          variant="quiet"
                        >
                          Deactivate
                        </KisokButton>
                      ) : (
                        <Link
                          aria-label={`Review activation ${product.name}`}
                          className={buttonVariants({ size: 'sm', variant: 'quiet' })}
                          href={`/admin/products/${product.id}/edit`}
                        >
                          Review activation
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

      <CompactPagination
        className="mt-6 justify-start"
        onPageChange={setPage}
        page={page}
        totalPages={totalPages}
      />
    </section>
  );
}
