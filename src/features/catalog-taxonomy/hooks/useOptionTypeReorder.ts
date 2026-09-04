'use client';

import { useState } from 'react';

import { computeReorderedIds } from '../lib/reorder';
import { catalogTaxonomyRepository } from '../repositories';

/** Same custom-mutation pattern as `useCategoryReorder`, global scope. */
export function useOptionTypeReorder(onReordered: () => void) {
  const [isReordering, setIsReordering] = useState(false);

  async function move(optionType: { id: string }, direction: 'up' | 'down') {
    setIsReordering(true);
    try {
      const all = await catalogTaxonomyRepository.listOptionTypes();
      const reorderedIds = computeReorderedIds(all, optionType.id, direction);
      if (!reorderedIds) return;

      await catalogTaxonomyRepository.reorderOptionTypes(reorderedIds);
      onReordered();
    } finally {
      setIsReordering(false);
    }
  }

  return { move, isReordering };
}
