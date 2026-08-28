'use client';

import { useEffect, useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  KisokButton,
  KisokDialog,
  KisokDialogContent,
  KisokDialogDescription,
  KisokDialogFooter,
  KisokDialogHeader,
  KisokDialogTitle,
  KisokInput,
  KisokTextarea,
} from '@/shared/ui';

import { useProductEditor } from '../hooks/useProductEditor';
import { productCatalogRepository } from '../repositories';
import type { ProductRecord } from '../types';

type ProductFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  product?: ProductRecord;
  brands: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; parentId: string | null }>;
  onSaved: () => void;
};

/**
 * Lean V2 Products may stay "incomplete" — nothing here is required beyond
 * a name. Editing an existing Product reloads its current Category
 * assignment (`listProductCategoryIds`) so the checkboxes reflect reality;
 * saving always sends the full desired Category set through
 * `setProductCategories`, which is the only way to remove every Category
 * from a Product that previously had some.
 */
export function ProductFormDialog({
  open,
  onOpenChange,
  mode,
  product,
  brands,
  categories,
  onSaved,
}: ProductFormDialogProps) {
  const { submit, isSubmitting, error } = useProductEditor({ mode, productId: product?.id });
  const [name, setName] = useState('');
  const [brandId, setBrandId] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && product) {
      setName(product.name);
      setBrandId(product.brandId ?? '');
      setShortDescription(product.shortDescription ?? '');
      setIsFeatured(product.isFeatured);
      setIsActive(product.isActive);
      setIsLoadingCategories(true);
      productCatalogRepository
        .listProductCategoryIds(product.id)
        .then(setCategoryIds)
        .catch(() => setCategoryIds([]))
        .finally(() => setIsLoadingCategories(false));
    } else {
      setName('');
      setBrandId('');
      setShortDescription('');
      setIsFeatured(false);
      setIsActive(true);
      setCategoryIds([]);
    }
  }, [open, mode, product]);

  async function handleSubmit() {
    await submit({
      name: name.trim(),
      brandId: brandId || null,
      shortDescription: shortDescription.trim() || null,
      isFeatured,
      isActive,
      categoryIds,
    });
    onSaved();
    onOpenChange(false);
  }

  return (
    <KisokDialog onOpenChange={onOpenChange} open={open}>
      <KisokDialogContent>
        <KisokDialogHeader>
          <KisokDialogTitle>{mode === 'create' ? 'New product' : 'Edit product'}</KisokDialogTitle>
          <KisokDialogDescription>
            {mode === 'create'
              ? 'Create a Product in the hosted catalog. This workspace stores operational catalog data only.'
              : 'Update this Product. It may stay incomplete — nothing here is required beyond a name.'}
          </KisokDialogDescription>
        </KisokDialogHeader>
        <div className="grid gap-4">
          <label className="grid gap-2" htmlFor="product-name">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
              Product name
            </span>
            <KisokInput
              id="product-name"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <label className="grid gap-2" htmlFor="product-brand">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
              Brand
            </span>
            <NativeSelect
              className="w-full"
              id="product-brand"
              onChange={(event) => setBrandId(event.target.value)}
              value={brandId}
            >
              <NativeSelectOption value="">Unassigned</NativeSelectOption>
              {brands.map((brand) => (
                <NativeSelectOption key={brand.id} value={brand.id}>
                  {brand.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          <fieldset className="grid gap-2">
            <legend className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
              Categories
            </legend>
            {isLoadingCategories ? (
              <p className="text-muted-foreground text-sm" role="status">
                Loading categories…
              </p>
            ) : (
              <div className="grid max-h-48 gap-1 overflow-y-auto rounded-xl border border-border bg-muted/25 p-2">
                {categories.map((category) => (
                  <div
                    className="flex min-h-10 items-center gap-3 rounded-lg px-2 text-sm hover:bg-accent/40"
                    key={category.id}
                  >
                    <Checkbox
                      checked={categoryIds.includes(category.id)}
                      id={`product-category-${category.id}`}
                      onCheckedChange={(checked) =>
                        setCategoryIds((current) =>
                          checked === true
                            ? [...current, category.id]
                            : current.filter((id) => id !== category.id),
                        )
                      }
                    />
                    <Label
                      className="min-h-10 flex-1 cursor-pointer"
                      htmlFor={`product-category-${category.id}`}
                    >
                      {category.parentId ? `↳ ${category.name}` : category.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </fieldset>
          <label className="grid gap-2" htmlFor="product-description">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
              Description
            </span>
            <KisokTextarea
              id="product-description"
              onChange={(event) => setShortDescription(event.target.value)}
              value={shortDescription}
            />
          </label>
          <div className="flex min-h-10 items-center gap-3 text-sm">
            <Checkbox
              checked={isFeatured}
              id="product-featured"
              onCheckedChange={(checked) => setIsFeatured(checked === true)}
            />
            <Label className="cursor-pointer" htmlFor="product-featured">
              Feature this product
            </Label>
          </div>
          {mode === 'edit' ? (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isActive}
                id="product-active"
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              <Label htmlFor="product-active">Active</Label>
            </div>
          ) : null}
        </div>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <KisokDialogFooter>
          <KisokButton disabled={isSubmitting} onClick={() => onOpenChange(false)} variant="quiet">
            Cancel
          </KisokButton>
          <KisokButton disabled={isSubmitting || !name.trim()} onClick={() => void handleSubmit()}>
            {isSubmitting ? 'Saving…' : 'Save product'}
          </KisokButton>
        </KisokDialogFooter>
      </KisokDialogContent>
    </KisokDialog>
  );
}
