'use client';

import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDownIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ConfirmActionDialog } from '@/features/catalog-taxonomy/components/ConfirmActionDialog';
import {
  KisokButton,
  KisokDialog,
  KisokDialogContent,
  KisokDialogDescription,
  KisokDialogFooter,
  KisokDialogHeader,
  KisokDialogTitle,
  KisokInput,
} from '@/shared/ui';

import {
  type VariantEditorFormValues,
  type VariantEditorValues,
  variantEditorDefaultValues,
  variantEditorSchema,
} from '../schemas/variant-editor.schema';
import type { VariantInput, VariantRecord, VariantUpdate } from '../types';

type CreateProps = {
  mode: 'create';
  productId: string;
  onCreate: (input: VariantInput) => Promise<void>;
  onUpdate?: undefined;
  variant?: undefined;
};

type EditProps = {
  mode: 'edit';
  onCreate?: undefined;
  onUpdate: (id: string, input: VariantUpdate) => Promise<void>;
  productId?: undefined;
  variant: VariantRecord;
};

type VariantFormDialogProps = (CreateProps | EditProps) & {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

function toFormValues(variant?: VariantRecord): VariantEditorFormValues {
  if (!variant) return variantEditorDefaultValues;
  return {
    barcode: variant.barcode ?? '',
    isActive: variant.isActive,
    lowStockThreshold: variant.lowStockThreshold === null ? '' : String(variant.lowStockThreshold),
    titleOverride: variant.titleOverride ?? '',
  };
}

export function VariantFormDialog(props: VariantFormDialogProps) {
  const { mode, onOpenChange, open } = props;
  const form = useForm<VariantEditorFormValues, undefined, VariantEditorValues>({
    defaultValues: variantEditorDefaultValues,
    resolver: zodResolver(variantEditorSchema),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showAdvancedOverride, setShowAdvancedOverride] = useState(false);
  const editVariant = mode === 'edit' ? props.variant : undefined;

  const isDirty = form.formState.isDirty;

  useEffect(() => {
    if (!open) return;
    form.reset(toFormValues(editVariant));
    setError(null);
    setShowAdvancedOverride(Boolean(editVariant?.titleOverride));
  }, [editVariant, form, open]);

  function handleOpenChange(next: boolean) {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (isDirty && !isSaving) {
      setShowDiscardConfirm(true);
      return;
    }
    onOpenChange(false);
  }

  async function save(values: VariantEditorValues) {
    setIsSaving(true);
    setError(null);
    try {
      if (mode === 'create') {
        await props.onCreate({
          barcode: values.barcode,
          lowStockThreshold: values.lowStockThreshold,
          productId: props.productId,
          titleOverride: values.titleOverride,
        });
      } else {
        await props.onUpdate(props.variant.id, {
          barcode: values.barcode,
          isActive: values.isActive,
          lowStockThreshold: values.lowStockThreshold,
          titleOverride: values.titleOverride,
        });
      }
      onOpenChange(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'The Variant could not be saved.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <KisokDialog onOpenChange={handleOpenChange} open={open}>
        <KisokDialogContent>
          <KisokDialogHeader>
            <KisokDialogTitle>
              {mode === 'create' ? 'Add Variant' : 'Edit Variant'}
            </KisokDialogTitle>
            <KisokDialogDescription>
              SKU is automatically generated. Variant names are derived from assigned Option Values.
            </KisokDialogDescription>
          </KisokDialogHeader>

          <form className="grid gap-4" onSubmit={(event) => void form.handleSubmit(save)(event)}>
            {mode === 'edit' ? (
              <div className="grid gap-2">
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
                  SKU
                </span>
                <p className="font-mono text-sm break-all">{props.variant.sku}</p>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="variant-barcode">Barcode</Label>
              <KisokInput
                aria-describedby={
                  form.formState.errors.barcode ? 'variant-barcode-error' : undefined
                }
                aria-invalid={Boolean(form.formState.errors.barcode)}
                id="variant-barcode"
                {...form.register('barcode')}
              />
              {form.formState.errors.barcode ? (
                <p className="text-destructive text-sm" id="variant-barcode-error" role="alert">
                  {form.formState.errors.barcode.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="variant-threshold">Low-stock threshold</Label>
              <KisokInput
                aria-describedby={
                  form.formState.errors.lowStockThreshold ? 'variant-threshold-error' : undefined
                }
                aria-invalid={Boolean(form.formState.errors.lowStockThreshold)}
                id="variant-threshold"
                inputMode="numeric"
                {...form.register('lowStockThreshold')}
              />
              {form.formState.errors.lowStockThreshold ? (
                <p className="text-destructive text-sm" id="variant-threshold-error" role="alert">
                  {form.formState.errors.lowStockThreshold.message}
                </p>
              ) : null}
            </div>

            {/* Progressive disclosure for title override */}
            <div className="rounded-lg border border-border/70 p-3">
              <button
                className="flex w-full items-center justify-between font-medium text-muted-foreground text-xs hover:text-foreground cursor-pointer"
                onClick={() => setShowAdvancedOverride((prev) => !prev)}
                type="button"
              >
                <span>Advanced: Custom Title Override</span>
                <ChevronDownIcon
                  aria-hidden="true"
                  className={`size-4 transition-transform ${showAdvancedOverride ? 'rotate-180' : ''}`}
                />
              </button>
              {showAdvancedOverride ? (
                <div className="mt-3 grid gap-2">
                  <Label htmlFor="variant-title-override">Title override</Label>
                  <KisokInput
                    id="variant-title-override"
                    placeholder="Leave empty to use Option Value combination"
                    {...form.register('titleOverride')}
                  />
                  <p className="text-muted-foreground text-xs">
                    Overrides standard name computation (e.g. &ldquo;Holiday Special
                    Edition&rdquo;).
                  </p>
                </div>
              ) : null}
            </div>

            {mode === 'edit' ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.watch('isActive')}
                  id="variant-active"
                  onCheckedChange={(checked) =>
                    form.setValue('isActive', checked === true, { shouldDirty: true })
                  }
                />
                <Label htmlFor="variant-active">Active</Label>
              </div>
            ) : null}

            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
            <KisokDialogFooter>
              <KisokButton
                disabled={isSaving}
                onClick={() => handleOpenChange(false)}
                type="button"
                variant="quiet"
              >
                Cancel
              </KisokButton>
              <KisokButton disabled={isSaving} type="submit">
                {isSaving ? 'Saving…' : 'Save variant'}
              </KisokButton>
            </KisokDialogFooter>
          </form>
        </KisokDialogContent>
      </KisokDialog>

      <ConfirmActionDialog
        confirmLabel="Discard"
        description="You have unsaved changes to this Variant form. Are you sure you want to discard them?"
        destructive
        onCancel={() => setShowDiscardConfirm(false)}
        onConfirm={() => {
          setShowDiscardConfirm(false);
          onOpenChange(false);
        }}
        open={showDiscardConfirm}
        title="Discard unsaved Variant changes?"
      />
    </>
  );
}
