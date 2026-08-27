'use client';

import { useEffect, useState } from 'react';

import { buttonVariants } from '@/components/ui/button';
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
import { Link } from '@/i18n/navigation';
import { KisokButton, KisokInput, StatusPill } from '@/shared/ui';

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
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const { products, total, pageSize, isLoading, isError, refetch } = useProductsList({
    page,
    search: debouncedSearch,
  });

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
                <TableHead>Available</TableHead>
                <TableHead>Signal</TableHead>
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
                  <TableCell className="font-mono text-sm">{product.availableStock}</TableCell>
                  <TableCell>
                    <StatusPill
                      className={
                        product.status === 'Out of stock'
                          ? 'border-destructive text-destructive'
                          : undefined
                      }
                    >
                      {product.status}
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
    </section>
  );
}
