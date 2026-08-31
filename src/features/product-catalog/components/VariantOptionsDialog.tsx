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
import { ConfirmActionDialog } from '@/features/catalog-taxonomy/components/ConfirmActionDialog';
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
import { productCatalogRepository } from '../repositories';
import type { VariantRecord } from '../types';
import { CreatableOptionValueCombobox } from './CreatableOptionValueCombobox';

export function VariantOptionsDialog({
  open,
  onOpenChange,
  variantId,
  variantLabel,
  optionTypes,
  siblingVariants = [],
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variantId: string;
  variantLabel: string;
  optionTypes: OptionTypeRecord[];
  siblingVariants?: Pick<VariantRecord, 'id' | 'sku'>[];
  onSaved?: () => void;
}) {
  const {
    selections,
    isLoading,
    isError,
    isDirty,
    refetch,
    formError,
    isSubmitting,
    submitError,
    addSelection,
    removeSelection,
    submit,
  } = useVariantOptionValues(variantId);

  const [pendingTypeId, setPendingTypeId] = useState<string | null>(null);
  const [pendingValueId, setPendingValueId] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const activeOptionTypes = optionTypes.filter((optionType) => optionType.isActive);
  const availableOptionTypes = activeOptionTypes.filter(
    (optionType) => !selections.some((selection) => selection.optionTypeId === optionType.id),
  );
  const pendingType = activeOptionTypes.find((optionType) => optionType.id === pendingTypeId);
  const availableValues = (pendingType?.values ?? []).filter((value) => value.isActive);

  function handleRequestClose() {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onOpenChange(false);
    }
  }

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
    setDuplicateError(null);
    setIsCheckingDuplicates(true);

    const candidateSignature = selections
      .map((selection) => `${selection.optionTypeId}:${selection.optionValueId}`)
      .sort()
      .join('|');
    try {
      const siblingCombinations = await Promise.all(
        siblingVariants.map(async (sibling) => ({
          sibling,
          selections: await productCatalogRepository.listVariantOptionValues(sibling.id),
        })),
      );
      const duplicate = siblingCombinations.find(
        ({ selections: siblingSelections }) =>
          siblingSelections
            .map((selection) => `${selection.optionTypeId}:${selection.optionValueId}`)
            .sort()
            .join('|') === candidateSignature,
      );
      if (duplicate) {
        setDuplicateError(
          `This Option combination duplicates Variant ${duplicate.sibling.sku}. Choose a distinct combination.`,
        );
        setIsCheckingDuplicates(false);
        return;
      }
    } catch {
      setDuplicateError('Sibling Variant combinations could not be checked. Retry before saving.');
      setIsCheckingDuplicates(false);
      return;
    } finally {
      setIsCheckingDuplicates(false);
    }

    const saved = await submit();
    if (!saved) return;
    onSaved?.();
    onOpenChange(false);
  }

  const isBusy = isLoading || isError || isSubmitting || isCheckingDuplicates;

  return (
    <>
      <KisokDialog
        onOpenChange={(next) => {
          if (!next) {
            handleRequestClose();
          } else {
            onOpenChange(true);
          }
        }}
        open={open}
      >
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
                    <KisokButton
                      aria-label={`Remove ${selection.optionTypeName}: ${selection.optionValueName}`}
                      disabled={isBusy}
                      onClick={() => removeSelection(selection.optionTypeId)}
                      size="xs"
                      type="button"
                      variant="quiet"
                    >
                      ×
                    </KisokButton>
                  </span>
                ))
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor="variant-option-type">Option Type</Label>
              <Select
                disabled={isBusy}
                onValueChange={(value) => {
                  setPendingTypeId((value as string) ?? null);
                  setPendingValueId(null);
                }}
                value={pendingTypeId}
              >
                <SelectTrigger id="variant-option-type">
                  <SelectValue placeholder="Choose a type">
                    {(val: string | null) => {
                      if (!val) return 'Choose a type';
                      const found = optionTypes.find((t) => t.id === val);
                      return found ? found.name : val;
                    }}
                  </SelectValue>
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
              <CreatableOptionValueCombobox
                disabled={!pendingType || isBusy}
                id="variant-option-value"
                onCreated={(createdRecord) => {
                  setPendingValueId(createdRecord.id);
                }}
                onValueChange={(val) => setPendingValueId(val)}
                optionType={pendingType}
                value={pendingValueId}
              />
            </div>
            <KisokButton
              disabled={isBusy || !(pendingType && pendingValueId)}
              onClick={handleAdd}
              type="button"
            >
              Add
            </KisokButton>
          </div>

          {isError ? (
            <div className="grid gap-2" role="alert">
              <p className="text-destructive text-sm">
                Existing Option Values could not be loaded. Retry before making changes.
              </p>
              <KisokButton
                disabled={isSubmitting}
                onClick={() => void refetch()}
                size="sm"
                type="button"
                variant="outline"
              >
                Retry loading combination
              </KisokButton>
            </div>
          ) : null}
          {duplicateError ? (
            <p className="text-destructive text-sm" role="alert">
              {duplicateError}
            </p>
          ) : null}
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
              disabled={isSubmitting || isCheckingDuplicates}
              onClick={handleRequestClose}
              type="button"
              variant="quiet"
            >
              Cancel
            </KisokButton>
            <KisokButton disabled={isBusy} onClick={() => void handleSubmit()} type="button">
              {isCheckingDuplicates
                ? 'Checking combination…'
                : isSubmitting
                  ? 'Saving…'
                  : 'Save combination'}
            </KisokButton>
          </KisokDialogFooter>
        </KisokDialogContent>
      </KisokDialog>

      <ConfirmActionDialog
        confirmLabel="Discard"
        description="You have unsaved changes to this Variant's Option Values. Are you sure you want to discard them?"
        destructive
        onCancel={() => setShowDiscardConfirm(false)}
        onConfirm={() => {
          setShowDiscardConfirm(false);
          onOpenChange(false);
        }}
        open={showDiscardConfirm}
        title="Discard unsaved Option changes?"
      />
    </>
  );
}
