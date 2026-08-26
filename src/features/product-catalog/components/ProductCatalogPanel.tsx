'use client';

import { useCallback, useEffect, useState } from 'react';

import { KisokButton, StatusPill } from '@/shared/ui';

import { productCatalogRepository } from '../repositories';
import type { ProductRecord } from '../types';

export function ProductCatalogPanel() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProducts(await productCatalogRepository.listProducts());
    } catch {
      setError('Products could not be loaded. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section className="border border-border bg-card p-5 text-card-foreground sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.2em]">
            Product catalog / hosted data
          </p>
          <h1 className="mt-2 font-black text-5xl tracking-[-0.08em] sm:text-6xl">
            Product catalog
          </h1>
        </div>
        <KisokButton onClick={() => void refresh()} variant="outline">
          Refresh
        </KisokButton>
      </div>

      {loading ? (
        <p className="mt-6 text-muted-foreground text-sm" role="status">
          Loading products…
        </p>
      ) : error ? (
        <div className="mt-6 grid gap-3" role="alert">
          <p className="text-destructive text-sm">{error}</p>
          <KisokButton onClick={() => void refresh()} variant="outline">
            Try again
          </KisokButton>
        </div>
      ) : products.length === 0 ? (
        <p className="mt-6 text-muted-foreground text-sm">No products are available.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[680px] w-full text-left">
            <thead className="border-border border-b font-mono text-muted-foreground text-[10px] uppercase tracking-[0.17em]">
              <tr>
                <th className="pr-6 pb-3 font-medium">Product</th>
                <th className="pr-6 pb-3 font-medium">Brand</th>
                <th className="pr-6 pb-3 font-medium">Variants</th>
                <th className="pr-6 pb-3 font-medium">Available</th>
                <th className="pb-3 text-right font-medium">Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product) => (
                <tr className="group" key={product.id}>
                  <td className="py-5 pr-6 font-bold">{product.name}</td>
                  <td className="py-5 pr-6 text-muted-foreground text-sm">
                    {product.brandName ?? 'Unassigned'}
                  </td>
                  <td className="py-5 pr-6 font-mono text-muted-foreground text-sm">
                    {product.variantCount}
                  </td>
                  <td className="py-5 pr-6 font-mono text-sm">{product.availableStock}</td>
                  <td className="py-5 text-right">
                    <StatusPill
                      className={
                        product.status === 'Out of stock'
                          ? 'border-destructive text-destructive'
                          : undefined
                      }
                    >
                      {product.status}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
