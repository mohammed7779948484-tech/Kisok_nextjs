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
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      setSelections(await productCatalogRepository.listVariantOptionValues(variantId));
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [variantId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  function addSelection(selection: VariantOptionValueRecord) {
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
    setFormError(null);
    setSelections((current) => current.filter((entry) => entry.optionTypeId !== optionTypeId));
  }

  async function submit() {
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
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Save failed.';
      setSubmitError(message);
      throw caughtError;
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    selections,
    isLoading,
    isError,
    formError,
    isSubmitting,
    submitError,
    addSelection,
    removeSelection,
    submit,
    refetch,
  };
}
