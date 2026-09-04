'use client';

import { useState } from 'react';

import { XIcon } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BrandRecord, CategoryRecord } from '@/features/catalog-taxonomy/types';
import { KisokInput } from '@/shared/ui';

import type {
  ProductEditorFormValues,
  ProductEditorValues,
} from '../../schemas/product-editor.schema';

type ProductClassificationSectionProps = {
  brands: BrandRecord[];
  categories: CategoryRecord[];
  form: UseFormReturn<ProductEditorFormValues, undefined, ProductEditorValues>;
  isReadOnly: boolean;
};

function formatCategoryName(category: CategoryRecord, categoriesById: Map<string, CategoryRecord>) {
  const parent = category.parentId ? categoriesById.get(category.parentId) : null;
  return parent ? `${parent.name} ↳ ${category.name}` : category.name;
}

export function ProductClassificationSection({
  brands,
  categories,
  form,
  isReadOnly,
}: ProductClassificationSectionProps) {
  const [categoryFilter, setCategoryFilter] = useState('');
  const selectedBrandId = form.watch('brandId');
  const selectedCategoryIds = form.watch('categoryIds');
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const visibleBrands = brands.filter((brand) => brand.isActive || brand.id === selectedBrandId);

  function toggleCategory(categoryId: string, checked: boolean) {
    const current = form.getValues('categoryIds');
    form.setValue(
      'categoryIds',
      checked ? [...current, categoryId] : current.filter((id) => id !== categoryId),
      { shouldDirty: true },
    );
  }

  function removeCategory(categoryId: string) {
    if (isReadOnly) return;
    const current = form.getValues('categoryIds');
    form.setValue(
      'categoryIds',
      current.filter((id) => id !== categoryId),
      { shouldDirty: true },
    );
  }

  const filteredCategories = categories.filter((category) => {
    if (!categoryFilter.trim()) return true;
    const term = categoryFilter.trim().toLowerCase();
    const formatted = formatCategoryName(category, categoriesById).toLowerCase();
    return formatted.includes(term);
  });

  return (
    <section className="border border-border p-5">
      <div className="border-border border-b pb-4">
        <h2 className="font-black text-2xl tracking-[-0.06em]">Classification</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Associate an active Brand and one or more Categories. Existing inactive assignments remain
          visible so they can be corrected deliberately.
        </p>
      </div>
      <div className="mt-5 grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="product-brand">Brand</Label>
          <Select
            disabled={isReadOnly}
            onValueChange={(value) =>
              form.setValue('brandId', value === '__none__' ? null : String(value), {
                shouldDirty: true,
              })
            }
            value={selectedBrandId ?? '__none__'}
          >
            <SelectTrigger className="w-full" id="product-brand">
              <SelectValue placeholder="No Brand">
                {(val: string | null) => {
                  if (!val || val === '__none__') return 'No Brand';
                  const brand = brands.find((b) => b.id === val);
                  return brand
                    ? `${brand.name}${!brand.isActive ? ' — Inactive assignment' : ''}`
                    : val;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="__none__">No Brand</SelectItem>
                {visibleBrands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                    {!brand.isActive ? ' — Inactive assignment' : ''}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {brands.find((brand) => brand.id === selectedBrandId && !brand.isActive) ? (
            <p className="text-warning text-sm">
              This Product keeps an inactive Brand assignment and cannot be customer-visible until
              it is changed or reactivated.
            </p>
          ) : null}
        </div>

        <fieldset className="grid gap-3">
          <legend className="font-medium text-sm">Categories</legend>

          {/* Selected Category Chips */}
          {selectedCategoryIds.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedCategoryIds.map((id) => {
                const cat = categoriesById.get(id);
                if (!cat) return null;
                return (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium"
                    key={id}
                  >
                    <span>{formatCategoryName(cat, categoriesById)}</span>
                    {!isReadOnly ? (
                      <button
                        aria-label={`Remove category ${cat.name}`}
                        className="cursor-pointer text-muted-foreground hover:text-foreground"
                        onClick={() => removeCategory(id)}
                        type="button"
                      >
                        <XIcon aria-hidden="true" className="size-3" />
                      </button>
                    ) : null}
                  </span>
                );
              })}
            </div>
          ) : null}

          {categories.length > 6 ? (
            <div className="max-w-xs">
              <KisokInput
                aria-label="Filter categories"
                onChange={(e) => setCategoryFilter(e.target.value)}
                placeholder="Filter categories…"
                value={categoryFilter}
              />
            </div>
          ) : null}

          {categories.length === 0 ? (
            <p className="text-muted-foreground text-sm">No Categories are available.</p>
          ) : filteredCategories.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No Categories match &ldquo;{categoryFilter}&rdquo;.
            </p>
          ) : (
            <div className="grid max-h-56 gap-2 overflow-y-auto rounded-lg border border-border/50 p-2 sm:grid-cols-2">
              {filteredCategories.map((category) => {
                const checked = selectedCategoryIds.includes(category.id);
                const checkboxId = `product-category-${category.id}`;
                return (
                  <label
                    className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 text-sm hover:bg-muted/40"
                    htmlFor={checkboxId}
                    key={category.id}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={isReadOnly || !(category.isActive || checked)}
                      id={checkboxId}
                      onCheckedChange={(next) => toggleCategory(category.id, next === true)}
                    />
                    <span>
                      {formatCategoryName(category, categoriesById)}
                      {!category.isActive ? ' — Inactive' : ''}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>
      </div>
    </section>
  );
}
