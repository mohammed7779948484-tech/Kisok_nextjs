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
