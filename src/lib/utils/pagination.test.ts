import { describe, expect, it } from 'vitest';

import { buildPaginationRange } from './pagination';

describe('buildPaginationRange', () => {
  it('returns every page when the total fits without truncation', () => {
    expect(buildPaginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('shows a trailing ellipsis when near the start of a long range', () => {
    expect(buildPaginationRange(1, 20)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 20]);
  });

  it('shows a leading ellipsis when near the end of a long range', () => {
    expect(buildPaginationRange(20, 20)).toEqual([1, 'ellipsis', 16, 17, 18, 19, 20]);
  });

  it('shows both a leading and trailing ellipsis around the current page', () => {
    expect(buildPaginationRange(10, 20)).toEqual([1, 'ellipsis', 9, 10, 11, 'ellipsis', 20]);
  });

  it('never renders more than a bounded number of page links for a huge total', () => {
    const range = buildPaginationRange(500, 1000);
    expect(range.length).toBeLessThanOrEqual(9);
    expect(range).toContain(1);
    expect(range).toContain(1000);
    expect(range).toContain(500);
  });
});
