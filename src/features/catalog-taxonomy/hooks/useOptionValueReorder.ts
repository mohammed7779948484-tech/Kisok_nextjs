'use client';

import { useState } from 'react';

import { computeReorderedIds } from '../lib/reorder';
import { catalogTaxonomyRepository } from '../repositories';
import type { OptionValueRecord } from '../types';

/**
 * Same custom-mutation pattern as `useCategoryReorder`/`useOptionTypeReorder`,
 * scoped to one Option Type. Unlike those, the complete ordered scope is
 * already sitting in the caller's `useOptionValuesForType` result (fetched
 * unpaginated), so this takes it as a parameter instead of re-fetching it.
 */
export function useOptionValueReorder(
  optionTypeId: string,
  currentValues: OptionValueRecord[],
  onReordered: () => void,
) {
  const [isReordering, setIsReordering] = useState(false);

  async function move(optionValue: OptionValueRecord, direction: 'up' | 'down') {
    const reorderedIds = computeReorderedIds(currentValues, optionValue.id, direction);
    if (!reorderedIds) return;

    setIsReordering(true);
    try {
      await catalogTaxonomyRepository.reorderOptionValues(optionTypeId, reorderedIds);
      onReordered();
    } finally {
      setIsReordering(false);
    }
  }

  return { move, isReordering };
}
