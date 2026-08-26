'use client';

import { useCallback, useEffect, useState } from 'react';

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

import { catalogTaxonomyRepository } from '../repositories';
import type { BrandRecord } from '../types';

export function CatalogTaxonomyPanel() {
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBrands(await catalogTaxonomyRepository.listBrands(search));
    } catch {
      setError('Brands could not be loaded. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createBrand() {
    const name = brandName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      await catalogTaxonomyRepository.createBrand({ name });
      setBrandName('');
      setCreateOpen(false);
      await refresh();
    } catch {
      setError('The Brand could not be created. Check for duplicate or invalid data.');
    } finally {
      setCreating(false);
    }
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
          <KisokButton onClick={() => setCreateOpen(true)} variant="outline">
            Add brand
          </KisokButton>
          <KisokButton onClick={() => void refresh()} variant="outline">
            Refresh
          </KisokButton>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="brand-search">
          Search brands
        </label>
        <KisokInput
          id="brand-search"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search brands"
          value={search}
        />
        <KisokButton onClick={() => void refresh()} variant="outline">
          Search
        </KisokButton>
      </div>

      {loading ? (
        <p className="mt-6 text-muted-foreground text-sm" role="status">
          Loading brands…
        </p>
      ) : error ? (
        <div className="mt-6 grid gap-3" role="alert">
          <p className="text-destructive text-sm">{error}</p>
          <KisokButton onClick={() => void refresh()} variant="outline">
            Try again
          </KisokButton>
        </div>
      ) : brands.length === 0 ? (
        <p className="mt-6 text-muted-foreground text-sm">No brands match this search.</p>
      ) : (
        <div className="mt-6 divide-y divide-border border-border border-y">
          {brands.map((brand) => (
            <article className="flex items-center justify-between gap-4 py-5" key={brand.id}>
              <div>
                <p className="font-bold">{brand.name}</p>
                <p className="mt-1 font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                  Order {brand.displayOrder}
                </p>
              </div>
              <StatusPill
                className={brand.isActive ? undefined : 'border-destructive text-destructive'}
              >
                {brand.isActive ? 'Active' : 'Inactive'}
              </StatusPill>
            </article>
          ))}
        </div>
      )}

      <KisokDialog onOpenChange={setCreateOpen} open={createOpen}>
        <KisokDialogContent>
          <KisokDialogHeader>
            <KisokDialogTitle>Add Brand</KisokDialogTitle>
            <KisokDialogDescription>
              Create a reusable Brand in the hosted catalog.
            </KisokDialogDescription>
          </KisokDialogHeader>
          <label className="grid gap-2" htmlFor="brand-name">
            <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
              Brand name
            </span>
            <KisokInput
              id="brand-name"
              onChange={(event) => setBrandName(event.target.value)}
              value={brandName}
            />
          </label>
          <KisokDialogFooter>
            <KisokButton disabled={creating} onClick={() => setCreateOpen(false)} variant="quiet">
              Cancel
            </KisokButton>
            <KisokButton
              disabled={creating || !brandName.trim()}
              onClick={() => void createBrand()}
            >
              {creating ? 'Saving…' : 'Save brand'}
            </KisokButton>
          </KisokDialogFooter>
        </KisokDialogContent>
      </KisokDialog>
    </section>
  );
}
