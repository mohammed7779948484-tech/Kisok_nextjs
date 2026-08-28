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
              <SelectValue placeholder="No Brand" />
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
          {categories.length === 0 ? (
            <p className="text-muted-foreground text-sm">No Categories are available.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {categories.map((category) => {
                const checked = selectedCategoryIds.includes(category.id);
                const checkboxId = `product-category-${category.id}`;
                return (
                  <label
                    className="flex items-center gap-2 text-sm"
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
