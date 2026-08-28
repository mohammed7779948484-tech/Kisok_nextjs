import { describe, expect, it } from 'vitest';

import { computeReorderedIds, formatDisplayRank, organizeCategoriesHierarchy } from './reorder';

describe('computeReorderedIds', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('swaps an item with its predecessor when moving up', () => {
    expect(computeReorderedIds(items, 'b', 'up')).toEqual(['b', 'a', 'c']);
  });

  it('swaps an item with its successor when moving down', () => {
    expect(computeReorderedIds(items, 'b', 'down')).toEqual(['a', 'c', 'b']);
  });

  it('returns null when moving the first item up', () => {
    expect(computeReorderedIds(items, 'a', 'up')).toBeNull();
  });

  it('returns null when moving the last item down', () => {
    expect(computeReorderedIds(items, 'c', 'down')).toBeNull();
  });

  it('returns null when the id is not present in the scope', () => {
    expect(computeReorderedIds(items, 'missing', 'up')).toBeNull();
  });
});

describe('organizeCategoriesHierarchy', () => {
  it('groups child categories under their parent in displayOrder without scrambling', () => {
    const rawCategories = [
      { id: 'c-sub-1', name: 'Hot Coffee', parentId: 'c-root-1', displayOrder: 5 },
      { id: 'c-root-2', name: 'Bakery', parentId: null, displayOrder: 20 },
      { id: 'c-root-1', name: 'Coffee', parentId: null, displayOrder: 10 },
      { id: 'c-sub-2', name: 'Cold Coffee', parentId: 'c-root-1', displayOrder: 6 },
      { id: 'c-sub-3', name: 'Croissants', parentId: 'c-root-2', displayOrder: 21 },
    ];

    const organized = organizeCategoriesHierarchy(rawCategories);

    expect(organized.map((c) => c.id)).toEqual([
      'c-root-1',
      'c-sub-1',
      'c-sub-2',
      'c-root-2',
      'c-sub-3',
    ]);
  });
});

describe('formatDisplayRank', () => {
  it('formats 0-based or 1-based index as a clean user-facing rank tag #1, #2', () => {
    expect(formatDisplayRank(0)).toBe('#1');
    expect(formatDisplayRank(1)).toBe('#2');
    expect(formatDisplayRank(9)).toBe('#10');
  });
});
