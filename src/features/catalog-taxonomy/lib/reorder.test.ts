import { describe, expect, it } from 'vitest';

import { computeReorderedIds } from './reorder';

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
