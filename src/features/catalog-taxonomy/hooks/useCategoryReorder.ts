'use client';

import { useState } from 'react';

import { computeReorderedIds } from '../lib/reorder';
import { catalogTaxonomyRepository } from '../repositories';

/**
 * Reorder stays a custom domain mutation, not generic Refine `useUpdate`:
 * `display_order` is DB-owned, and the `reorder_items` RPC requires the
 * scope's complete ordered id list. `@refinedev/supabase`'s data provider
 * has no `custom` implementation, so this goes through the repository
 * directly (same as the old manual panels did) and simply calls back into
 * the caller's `refetch` once the mutation lands.
 */
export function useCategoryReorder(onReordered: () => void) {
  const [isReordering, setIsReordering] = useState(false);

  async function move(category: { id: string; parentId: string | null }, direction: 'up' | 'down') {
    setIsReordering(true);
    try {
      const all = await catalogTaxonomyRepository.listCategories();
      const siblings = all.filter((candidate) => candidate.parentId === category.parentId);
      const reorderedIds = computeReorderedIds(siblings, category.id, direction);
      if (!reorderedIds) return;

      await catalogTaxonomyRepository.reorderCategories(category.parentId, reorderedIds);
      onReordered();
    } finally {
      setIsReordering(false);
    }
  }

  return { move, isReordering };
}
