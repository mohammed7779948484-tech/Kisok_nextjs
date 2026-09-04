/**
 * Given a scope's complete, already-ordered id list (as the `reorder_items`
 * RPC requires — the whole scope, not a page of it), swap one item with its
 * neighbor and return the new complete order. Returns `null` when the move
 * is a no-op: the id is missing, or already at the edge of the scope in
 * that direction.
 */
export function computeReorderedIds(
  items: Array<{ id: string }>,
  id: string,
  direction: 'up' | 'down',
): string[] | null {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) return null;

  const ids = items.map((item) => item.id);
  const [moved] = ids.splice(index, 1);
  ids.splice(targetIndex, 0, moved);
  return ids;
}

/**
 * Organizes flat categories list into a hierarchical tree view:
 * Root categories are sorted by displayOrder, and each root category is
 * immediately followed by its subcategories sorted by displayOrder.
 */
export function organizeCategoriesHierarchy<
  T extends { id: string; parentId: string | null; displayOrder: number },
>(categories: T[]): T[] {
  const roots = categories
    .filter((category) => category.parentId === null)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const result: T[] = [];
  for (const root of roots) {
    result.push(root);
    const children = categories
      .filter((category) => category.parentId === root.id)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    result.push(...children);
  }

  // Handle any orphaned categories whose parent is not in the list
  const handledIds = new Set(result.map((category) => category.id));
  const orphans = categories
    .filter((category) => !handledIds.has(category.id))
    .sort((a, b) => a.displayOrder - b.displayOrder);
  result.push(...orphans);

  return result;
}

/**
 * Formats a 0-based visual index into a user-friendly rank `#1`, `#2`, ...
 * instead of raw internal database sequence counters (like 10450).
 */
export function formatDisplayRank(zeroBasedIndex: number): string {
  return `#${zeroBasedIndex + 1}`;
}
