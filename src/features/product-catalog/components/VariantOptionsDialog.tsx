'use client';

import { useState } from 'react';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OptionTypeRecord } from '@/features/catalog-taxonomy/types';
import {
  KisokButton,
  KisokDialog,
  KisokDialogContent,
  KisokDialogDescription,
  KisokDialogFooter,
  KisokDialogHeader,
  KisokDialogTitle,
} from '@/shared/ui';

import { useVariantOptionValues } from '../hooks/useVariantOptionValues';

export function VariantOptionsDialog({
  open,
  onOpenChange,
  variantId,
  variantLabel,
  optionTypes,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variantId: string;
  variantLabel: string;
  optionTypes: OptionTypeRecord[];
  onSaved?: () => void;
}) {
  const {
    selections,
    isLoading,
    formError,
    isSubmitting,
    submitError,
    addSelection,
    removeSelection,
    submit,
  } = useVariantOptionValues(variantId);
  const [pendingTypeId, setPendingTypeId] = useState<string | null>(null);
  const [pendingValueId, setPendingValueId] = useState<string | null>(null);

  const activeOptionTypes = optionTypes.filter((optionType) => optionType.isActive);
  const availableOptionTypes = activeOptionTypes.filter(
    (optionType) => !selections.some((selection) => selection.optionTypeId === optionType.id),
  );
  const pendingType = activeOptionTypes.find((optionType) => optionType.id === pendingTypeId);
  const availableValues = (pendingType?.values ?? []).filter((value) => value.isActive);

  function handleAdd() {
    if (!(pendingType && pendingValueId)) return;
    const value = availableValues.find((entry) => entry.id === pendingValueId);
    if (!value) return;
    addSelection({
      optionTypeId: pendingType.id,
      optionTypeName: pendingType.name,
      optionValueId: value.id,
      optionValueName: value.value,
    });
    setPendingTypeId(null);
    setPendingValueId(null);
  }

  async function handleSubmit() {
    await submit();
    onSaved?.();
    onOpenChange(false);
  }

  return (
    <KisokDialog onOpenChange={onOpenChange} open={open}>
      <KisokDialogContent>
        <KisokDialogHeader>
          <KisokDialogTitle>Options · {variantLabel}</KisokDialogTitle>
          <KisokDialogDescription>
            Every Option Type can contribute at most one Value to this Variant's combination.
          </KisokDialogDescription>
        </KisokDialogHeader>

        {isLoading ? (
          <p className="text-muted-foreground text-sm" role="status">
            Loading combination…
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selections.length === 0 ? (
              <p className="text-muted-foreground text-sm">No Option Values are assigned yet.</p>
            ) : (
              selections.map((selection) => (
                <span
                  className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs"
                  key={selection.optionTypeId}
                >
                  {selection.optionTypeName}: {selection.optionValueName}
                  <button
                    aria-label={`Remove ${selection.optionTypeName}: ${selection.optionValueName}`}
                    onClick={() => removeSelection(selection.optionTypeId)}
                    type="button"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="grid gap-2">
            <Label htmlFor="variant-option-type">Option Type</Label>
            <Select
              onValueChange={(value) => {
                setPendingTypeId((value as string) ?? null);
                setPendingValueId(null);
              }}
              value={pendingTypeId}
            >
              <SelectTrigger id="variant-option-type">
                <SelectValue placeholder="Choose a type" />
              </SelectTrigger>
              <SelectContent>
                {availableOptionTypes.map((optionType) => (
                  <SelectItem key={optionType.id} value={optionType.id}>
                    {optionType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="variant-option-value">Option Value</Label>
            <Select
              disabled={!pendingType}
              onValueChange={(value) => setPendingValueId((value as string) ?? null)}
              value={pendingValueId}
            >
              <SelectTrigger id="variant-option-value">
                <SelectValue placeholder="Choose a value" />
              </SelectTrigger>
              <SelectContent>
                {availableValues.map((value) => (
                  <SelectItem key={value.id} value={value.id}>
                    {value.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <KisokButton
            disabled={!(pendingType && pendingValueId)}
            onClick={handleAdd}
            type="button"
          >
            Add
          </KisokButton>
        </div>

        {formError ? (
          <p className="text-destructive text-sm" role="alert">
            {formError}
          </p>
        ) : null}
        {submitError ? (
          <p className="text-destructive text-sm" role="alert">
            {submitError}
          </p>
        ) : null}

        <KisokDialogFooter>
          <KisokButton
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="quiet"
          >
            Cancel
          </KisokButton>
          <KisokButton disabled={isSubmitting} onClick={() => void handleSubmit()} type="button">
            {isSubmitting ? 'Saving…' : 'Save combination'}
          </KisokButton>
        </KisokDialogFooter>
      </KisokDialogContent>
    </KisokDialog>
  );
}
