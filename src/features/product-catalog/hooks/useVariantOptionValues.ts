'use client';

import { useCallback, useEffect, useState } from 'react';

import { productCatalogRepository } from '../repositories';
import type { VariantOptionValueRecord } from '../types';

/**
 * Stages a Variant's Option Type → Option Value combination client-side
 * before handing the final list to `replaceVariantOptionValues` as one
 * atomic call. The one-Value-per-Option-Type rule is enforced here too
 * (inline UI feedback) even though the repository already enforces it
 * server-side — this hook never bypasses or duplicates that function's own
 * diff/rollback logic, it only decides what selections to submit.
 */
export function useVariantOptionValues(variantId: string) {
  const [selections, setSelections] = useState<VariantOptionValueRecord[]>([]);
  const [initialSelections, setInitialSelections] = useState<VariantOptionValueRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const fetched = await productCatalogRepository.listVariantOptionValues(variantId);
      setSelections(fetched);
      setInitialSelections(fetched);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [variantId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  function canMutate(): boolean {
    if (isLoading) {
      setFormError('Existing Option Values are still loading. Please wait before making changes.');
      return false;
    }
    if (isError) {
      setFormError('Existing Option Values could not be loaded. Retry before making changes.');
      return false;
    }
    return true;
  }

  function addSelection(selection: VariantOptionValueRecord) {
    if (!canMutate()) return;
    setFormError(null);
    setSelections((current) => {
      if (current.some((existing) => existing.optionTypeId === selection.optionTypeId)) {
        setFormError('A Variant can have at most one Value per Option Type.');
        return current;
      }
      return [...current, selection];
    });
  }

  function removeSelection(optionTypeId: string) {
    if (!canMutate()) return;
    setFormError(null);
    setSelections((current) => current.filter((entry) => entry.optionTypeId !== optionTypeId));
  }

  async function submit(): Promise<boolean> {
    if (!canMutate()) return false;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await productCatalogRepository.replaceVariantOptionValues(
        variantId,
        selections.map((selection) => ({
          optionTypeId: selection.optionTypeId,
          optionValueId: selection.optionValueId,
        })),
      );
      return true;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Save failed.';
      setSubmitError(message);
      throw caughtError;
    } finally {
      setIsSubmitting(false);
    }
    return false;
  }

  const isDirty =
    selections.length !== initialSelections.length ||
    selections
      .map((selection) => `${selection.optionTypeId}:${selection.optionValueId}`)
      .sort()
      .join('|') !==
      initialSelections
        .map((selection) => `${selection.optionTypeId}:${selection.optionValueId}`)
        .sort()
        .join('|');

  return {
    selections,
    isLoading,
    isError,
    isDirty,
    formError,
    isSubmitting,
    submitError,
    addSelection,
    removeSelection,
    submit,
    refetch,
  };
}
