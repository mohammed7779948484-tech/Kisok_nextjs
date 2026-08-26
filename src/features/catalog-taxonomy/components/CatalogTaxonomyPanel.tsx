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
import type { BrandRecord, CategoryRecord } from '../types';

type CatalogMode = 'brands' | 'categories';

export function CatalogTaxonomyPanel({ mode = 'brands' }: { mode?: CatalogMode }) {
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [categoryCreateOpen, setCategoryCreateOpen] = useState(false);
  const [categoryBeingEdited, setCategoryBeingEdited] = useState<CategoryRecord | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryParentId, setCategoryParentId] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'brands') {
        setBrands(await catalogTaxonomyRepository.listBrands(search));
      } else {
        setCategories(await catalogTaxonomyRepository.listCategories());
      }
    } catch {
      setError(
        `${mode === 'brands' ? 'Brands' : 'Categories'} could not be loaded. Check the connection and try again.`,
      );
    } finally {
      setLoading(false);
    }
  }, [mode, search]);

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

  async function saveCategory() {
    const name = categoryName.trim();
    if (!name) return;
    setCategorySaving(true);
    setError(null);
    try {
      if (categoryBeingEdited) {
        await catalogTaxonomyRepository.updateCategory(categoryBeingEdited.id, {
          name,
          parentId: categoryParentId || null,
        });
      } else {
        await catalogTaxonomyRepository.createCategory({
          name,
          parentId: categoryParentId || null,
        });
      }
      setCategoryName('');
      setCategoryParentId('');
      setCategoryBeingEdited(null);
      setCategoryCreateOpen(false);
      await refresh();
    } catch {
      setError('The Category could not be saved. Check the name, parent, and connection.');
    } finally {
      setCategorySaving(false);
    }
  }

  async function toggleCategory(category: CategoryRecord) {
    setError(null);
    try {
      await catalogTaxonomyRepository.updateCategory(category.id, { isActive: !category.isActive });
      await refresh();
    } catch {
      setError(`The Category ${category.name} could not be updated.`);
    }
  }

  function openCategoryEditor(category?: CategoryRecord) {
    setCategoryBeingEdited(category ?? null);
    setCategoryName(category?.name ?? '');
    setCategoryParentId(category?.parentId ?? '');
    setCategoryCreateOpen(true);
  }

  const isBrands = mode === 'brands';
  const emptyMessage = isBrands ? 'No brands match this search.' : 'No categories are available.';

  return (
    <section className="border border-border bg-card p-5 text-card-foreground sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.2em]">
            Catalog taxonomy / hosted data
          </p>
          <h1 className="mt-2 font-black text-5xl tracking-[-0.08em] sm:text-6xl">
            {isBrands ? 'Brands' : 'Categories'}
          </h1>
        </div>
        <div className="flex gap-2">
          {isBrands ? (
            <KisokButton onClick={() => setCreateOpen(true)} variant="outline">
              Add brand
            </KisokButton>
          ) : (
            <KisokButton onClick={() => openCategoryEditor()} variant="outline">
              Add category
            </KisokButton>
          )}
          <KisokButton onClick={() => void refresh()} variant="outline">
            Refresh
          </KisokButton>
        </div>
      </div>

      {isBrands ? (
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
      ) : null}

      {loading ? (
        <p className="mt-6 text-muted-foreground text-sm" role="status">
          Loading {isBrands ? 'brands' : 'categories'}…
        </p>
      ) : error ? (
        <div className="mt-6 grid gap-3" role="alert">
          <p className="text-destructive text-sm">{error}</p>
          <KisokButton onClick={() => void refresh()} variant="outline">
            Try again
          </KisokButton>
        </div>
      ) : isBrands && brands.length === 0 ? (
        <p className="mt-6 text-muted-foreground text-sm">{emptyMessage}</p>
      ) : !isBrands && categories.length === 0 ? (
        <p className="mt-6 text-muted-foreground text-sm">{emptyMessage}</p>
      ) : isBrands ? (
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
      ) : (
        <div className="mt-6 divide-y divide-border border-border border-y">
          {categories.map((category) => (
            <article className="flex items-center justify-between gap-4 py-5" key={category.id}>
              <div>
                <p className="font-bold">{category.name}</p>
                <p className="mt-1 font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                  {category.parentId ? 'Child category' : 'Root category'} · Order{' '}
                  {category.displayOrder}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill
                  className={category.isActive ? undefined : 'border-destructive text-destructive'}
                >
                  {category.isActive ? 'Active' : 'Inactive'}
                </StatusPill>
                <KisokButton onClick={() => openCategoryEditor(category)} size="sm" variant="quiet">
                  Edit
                </KisokButton>
                <KisokButton
                  aria-label={`${category.isActive ? 'Deactivate' : 'Activate'} ${category.name}`}
                  onClick={() => void toggleCategory(category)}
                  size="sm"
                  variant="quiet"
                >
                  {category.isActive ? 'Deactivate' : 'Activate'}
                </KisokButton>
              </div>
            </article>
          ))}
        </div>
      )}

      {!isBrands ? (
        <KisokDialog
          onOpenChange={(open) => {
            setCategoryCreateOpen(open);
            if (!open) {
              setCategoryBeingEdited(null);
              setCategoryName('');
              setCategoryParentId('');
            }
          }}
          open={categoryCreateOpen}
        >
          <KisokDialogContent>
            <KisokDialogHeader>
              <KisokDialogTitle>
                {categoryBeingEdited ? 'Edit Category' : 'Add Category'}
              </KisokDialogTitle>
              <KisokDialogDescription>
                Categories support one root level and one child level in the hosted Lean V2 catalog.
              </KisokDialogDescription>
            </KisokDialogHeader>
            <label className="grid gap-2" htmlFor="category-name">
              <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Category name
              </span>
              <KisokInput
                id="category-name"
                onChange={(event) => setCategoryName(event.target.value)}
                value={categoryName}
              />
            </label>
            <label className="grid gap-2" htmlFor="category-parent">
              <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Parent category
              </span>
              <select
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                id="category-parent"
                onChange={(event) => setCategoryParentId(event.target.value)}
                value={categoryParentId}
              >
                <option value="">Root category</option>
                {categories
                  .filter(
                    (category) =>
                      category.parentId === null && category.id !== categoryBeingEdited?.id,
                  )
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </label>
            <KisokDialogFooter>
              <KisokButton
                disabled={categorySaving}
                onClick={() => setCategoryCreateOpen(false)}
                variant="quiet"
              >
                Cancel
              </KisokButton>
              <KisokButton
                disabled={categorySaving || !categoryName.trim()}
                onClick={() => void saveCategory()}
              >
                {categorySaving ? 'Saving…' : 'Save category'}
              </KisokButton>
            </KisokDialogFooter>
          </KisokDialogContent>
        </KisokDialog>
      ) : null}

      {isBrands ? (
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
      ) : null}
    </section>
  );
}
