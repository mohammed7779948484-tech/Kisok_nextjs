'use client';

import { useState } from 'react';

import { computeReorderedIds } from '../lib/reorder';
import { catalogTaxonomyRepository } from '../repositories';

/** Same custom-mutation pattern as `useOptionTypeReorder`, global scope. */
export function useBrandReorder(onReordered: () => void) {
  const [isReordering, setIsReordering] = useState(false);

  async function move(brand: { id: string }, direction: 'up' | 'down') {
    setIsReordering(true);
    try {
      const all = await catalogTaxonomyRepository.listBrands();
      const reorderedIds = computeReorderedIds(all, brand.id, direction);
      if (!reorderedIds) return;

      await catalogTaxonomyRepository.reorderBrands(reorderedIds);
      onReordered();
    } finally {
      setIsReordering(false);
    }
  }

  return { move, isReordering };
}
