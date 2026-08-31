'use client';

import type { UseFormReturn } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { KisokInput, KisokTextarea } from '@/shared/ui';

import type {
  ProductEditorFormValues,
  ProductEditorValues,
} from '../../schemas/product-editor.schema';

type ProductBasicsTabProps = {
  canToggleActivation: boolean;
  form: UseFormReturn<ProductEditorFormValues, undefined, ProductEditorValues>;
  isReadOnly: boolean;
  mode: 'create' | 'edit' | 'show';
};

export function ProductBasicsTab({
  canToggleActivation,
  form,
  isReadOnly,
  mode,
}: ProductBasicsTabProps) {
  return (
    <section className="border border-border p-5">
      <div className="border-border border-b pb-4">
        <h2 className="font-black text-2xl tracking-[-0.06em]">Basic information</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Product identity, description, customer state, and search keywords.
        </p>
      </div>
      <div className="mt-5 grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="product-name">Product name</Label>
          <KisokInput
            aria-describedby={form.formState.errors.name ? 'product-name-error' : undefined}
            aria-invalid={Boolean(form.formState.errors.name)}
            disabled={isReadOnly}
            id="product-name"
            {...form.register('name')}
          />
          {form.formState.errors.name ? (
            <span className="text-destructive text-sm" id="product-name-error" role="alert">
              {form.formState.errors.name.message}
            </span>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="product-description">Description</Label>
          <KisokTextarea
            disabled={isReadOnly}
            id="product-description"
            {...form.register('shortDescription')}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="product-keywords">Search keywords</Label>
          <KisokInput
            aria-describedby="product-keywords-help"
            disabled={isReadOnly}
            id="product-keywords"
            placeholder="e.g. berry, sparkling, seasonal"
            {...form.register('searchKeywords')}
          />
          <span className="text-muted-foreground text-xs" id="product-keywords-help">
            Separate keywords with commas.
          </span>
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={form.watch('isFeatured')}
              disabled={isReadOnly}
              id="product-featured"
              onCheckedChange={(checked) =>
                form.setValue('isFeatured', checked === true, { shouldDirty: true })
              }
            />
            <Label htmlFor="product-featured">Feature this Product</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={form.watch('isActive')}
              disabled={isReadOnly || mode === 'create' || !canToggleActivation}
              id="product-active"
              onCheckedChange={(checked) =>
                form.setValue('isActive', checked === true, { shouldDirty: true })
              }
            />
            <Label htmlFor="product-active">
              {mode === 'create'
                ? 'Draft (activation follows setup)'
                : canToggleActivation
                  ? 'Active Product'
                  : 'Product activation waits for Variant eligibility'}
            </Label>
          </div>
        </div>
      </div>
    </section>
  );
}
