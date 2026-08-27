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
        <label className="grid gap-2" htmlFor="product-name">
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
            Product name
          </span>
          <KisokInput disabled={isReadOnly} id="product-name" {...form.register('name')} />
          {form.formState.errors.name ? (
            <span className="text-destructive text-sm">{form.formState.errors.name.message}</span>
          ) : null}
        </label>
        <label className="grid gap-2" htmlFor="product-description">
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
            Description
          </span>
          <KisokTextarea
            disabled={isReadOnly}
            id="product-description"
            {...form.register('shortDescription')}
          />
        </label>
        <label className="grid gap-2" htmlFor="product-keywords">
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
            Search keywords
          </span>
          <KisokInput
            disabled={isReadOnly}
            id="product-keywords"
            placeholder="e.g. berry, sparkling, seasonal"
            {...form.register('searchKeywords')}
          />
          <span className="text-muted-foreground text-xs">Separate keywords with commas.</span>
        </label>
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
