'use client';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { buildPaginationRange, PAGINATION_ELLIPSIS } from '@/lib/utils/pagination';

type CompactPaginationProps = {
  className?: string;
  onPageChange: (page: number) => void;
  page: number;
  siblingCount?: number;
  totalPages: number;
};

/**
 * Shared compact pagination control: previous/next plus a bounded, windowed
 * set of page numbers with ellipses, instead of rendering every page number
 * (`Array.from({ length: totalPages })`) which grows unbounded with the
 * result set. Renders nothing for a single page.
 */
export function CompactPagination({
  className,
  onPageChange,
  page,
  siblingCount,
  totalPages,
}: CompactPaginationProps) {
  if (totalPages <= 1) return null;
  const range = buildPaginationRange(page, totalPages, siblingCount);

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            aria-disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          />
        </PaginationItem>
        {range.map((item, index) =>
          item === PAGINATION_ELLIPSIS ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: ellipses have no stable identity of their own
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationLink isActive={item === page} onClick={() => onPageChange(item)}>
                {item}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext
            aria-disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
