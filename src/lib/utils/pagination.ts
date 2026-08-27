export const PAGINATION_ELLIPSIS = 'ellipsis' as const;

export type PaginationRangeItem = number | typeof PAGINATION_ELLIPSIS;

/**
 * Windowed page-number range for compact pagination controls: always shows
 * the first and last page, a run of `siblingCount` pages either side of the
 * current one, and collapses everything else behind at most two ellipses.
 * Never grows with the total page count, unlike rendering every page number
 * directly (`Array.from({ length: totalPages })`).
 */
export function buildPaginationRange(
  currentPage: number,
  totalPages: number,
  siblingCount = 1,
): PaginationRangeItem[] {
  const totalVisibleNumbers = siblingCount * 2 + 5;
  if (totalPages <= totalVisibleNumbers) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const showLeftEllipsis = leftSiblingIndex > 2;
  const showRightEllipsis = rightSiblingIndex < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftItemCount = 3 + siblingCount * 2;
    return [
      ...Array.from({ length: leftItemCount }, (_, index) => index + 1),
      PAGINATION_ELLIPSIS,
      totalPages,
    ];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightItemCount = 3 + siblingCount * 2;
    return [
      1,
      PAGINATION_ELLIPSIS,
      ...Array.from(
        { length: rightItemCount },
        (_, index) => totalPages - rightItemCount + index + 1,
      ),
    ];
  }

  return [
    1,
    PAGINATION_ELLIPSIS,
    ...Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, index) => leftSiblingIndex + index,
    ),
    PAGINATION_ELLIPSIS,
    totalPages,
  ];
}
