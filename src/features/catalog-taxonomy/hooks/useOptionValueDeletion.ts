'use client';

import { useState } from 'react';

import { catalogTaxonomyRepository } from '../repositories';
import type { OptionValueRecord } from '../types';

type UseOptionValueDeletionParams = {
  onCompleted?: () => Promise<void> | void;
};

/**
 * Same shape as `product-catalog`'s `useVariantDeletion`: attempt a real
 * hard delete, and when Lean V2's `product_variant_option_values` FK blocks
 * it (`23503`), surface a clear message instead of a generic failure —
 * no cascading delete is ever attempted.
 */
export function useOptionValueDeletion({ onCompleted }: UseOptionValueDeletionParams = {}) {
  const [optionValue, setOptionValue] = useState<OptionValueRecord | null>(null);
  const [inUseBlocked, setInUseBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  function begin(nextOptionValue: OptionValueRecord) {
    setOptionValue(nextOptionValue);
    setInUseBlocked(false);
    setError(null);
  }

  function cancel() {
    if (isWorking) return;
    setOptionValue(null);
    setInUseBlocked(false);
    setError(null);
  }

  async function confirm() {
    if (!optionValue) return;
    setIsWorking(true);
    setError(null);
    try {
      const result = await catalogTaxonomyRepository.deleteOptionValue(optionValue.id);
      if (result.outcome === 'in-use') {
        setInUseBlocked(true);
        setError(result.message);
        return;
      }
      await onCompleted?.();
      cancel();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'The Option Value could not be deleted. Try again or deactivate it instead.',
      );
    } finally {
      setIsWorking(false);
    }
  }

  return { begin, cancel, confirm, error, inUseBlocked, isWorking, optionValue };
}
