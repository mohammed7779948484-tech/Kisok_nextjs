'use client';

import { useState } from 'react';

import { productCatalogRepository } from '../repositories';
import type { VariantRecord } from '../types';

type UseVariantDeletionParams = {
  onCompleted?: () => Promise<void> | void;
};

export function useVariantDeletion({ onCompleted }: UseVariantDeletionParams = {}) {
  const [variant, setVariant] = useState<VariantRecord | null>(null);
  const [historyBlocked, setHistoryBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  function begin(nextVariant: VariantRecord) {
    setVariant(nextVariant);
    setHistoryBlocked(false);
    setError(null);
  }

  function cancel() {
    if (isWorking) return;
    setVariant(null);
    setHistoryBlocked(false);
    setError(null);
  }

  async function confirm() {
    if (!variant) return;
    setIsWorking(true);
    setError(null);
    try {
      if (historyBlocked) {
        await productCatalogRepository.updateVariant(variant.id, { isActive: false });
        await onCompleted?.();
        cancel();
        return;
      }
      const result = await productCatalogRepository.deleteVariant(variant.id);
      if (result.outcome === 'history-blocked') {
        setHistoryBlocked(true);
        return;
      }
      await onCompleted?.();
      cancel();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'The Variant could not be deleted. Try again or deactivate it instead.',
      );
    } finally {
      setIsWorking(false);
    }
  }

  return { begin, cancel, confirm, error, historyBlocked, isWorking, variant };
}
