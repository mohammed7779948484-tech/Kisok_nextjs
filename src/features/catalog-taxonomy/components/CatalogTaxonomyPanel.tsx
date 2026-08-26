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
import type { CategoryRecord } from '../types';

/**
 * Brands moved to `BrandsPanel`, a Refine + RHF/Zod reference
 * implementation (see `hooks/useBrandsList.ts`, `hooks/useBrandForm.ts`).
 * Categories remain on the manual repository pattern pending the same
 * migration (tracked in docs/PR6_COMPLETION_TODO.md).
 */
export function CatalogTaxonomyPanel() {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [categoryCreateOpen, setCategoryCreateOpen] = useState(false);
  const [categoryBeingEdited, setCategoryBeingEdited] = useState<CategoryRecord | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryParentId, setCategoryParentId] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCategories(await catalogTaxonomyRepository.listCategories());
    } catch {
      setError('Categories could not be loaded. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
          <KisokButton onClick={() => openCategoryEditor()} variant="outline">
            Add category
          </KisokButton>
          <KisokButton onClick={() => void refresh()} variant="outline">
            Refresh
          </KisokButton>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-muted-foreground text-sm" role="status">
          Loading categories…
        </p>
      ) : error ? (
        <div className="mt-6 grid gap-3" role="alert">
          <p className="text-destructive text-sm">{error}</p>
          <KisokButton onClick={() => void refresh()} variant="outline">
            Try again
          </KisokButton>
        </div>
      ) : categories.length === 0 ? (
        <p className="mt-6 text-muted-foreground text-sm">No categories are available.</p>
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
    </section>
  );
}
