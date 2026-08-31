'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CompactPagination, KisokButton, StatusPill } from '@/shared/ui';

import type { InventoryRecord } from '../types';

export interface InventoryStockTableProps {
  currentPage: number;
  isFiltered?: boolean;
  itemsPerPage: number;
  onAdjust: (row: InventoryRecord) => void;
  onClearFilters?: () => void;
  onPageChange: (page: number) => void;
  rows: InventoryRecord[];
  totalItems: number;
}

export function InventoryStockTable({
  currentPage,
  isFiltered = false,
  itemsPerPage,
  onAdjust,
  onClearFilters,
  onPageChange,
  rows,
  totalItems,
}: InventoryStockTableProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/25 px-5 py-14 text-center">
        <p className="font-semibold text-foreground text-sm">
          {isFiltered
            ? 'No inventory records match your filters'
            : 'No inventory records exist yet'}
        </p>
        <p className="mt-1 text-muted-foreground text-xs">
          {isFiltered
            ? 'Try clearing search filters or checking spelling.'
            : 'Variants created in the product catalog will automatically appear in inventory.'}
        </p>
        {isFiltered && onClearFilters ? (
          <KisokButton
            className="mt-4"
            onClick={onClearFilters}
            size="sm"
            type="button"
            variant="outline"
          >
            Clear filters
          </KisokButton>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-[38%] font-mono text-[10px] uppercase tracking-[0.16em]">
                Product & Variant
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-[0.16em]">
                Barcode
              </TableHead>
              <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.16em]">
                Quantity
              </TableHead>
              <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.16em]">
                Threshold
              </TableHead>
              <TableHead className="text-center font-mono text-[10px] uppercase tracking-[0.16em]">
                Status
              </TableHead>
              <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.16em]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                className="border-border transition-colors hover:bg-muted/40"
                key={row.variantId}
              >
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-bold text-foreground text-sm break-words">
                      {row.productName}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-block rounded-md border border-border bg-muted/60 px-2 py-0.5 font-medium text-foreground text-xs">
                        {row.variantName}
                      </span>
                      <span className="font-mono text-muted-foreground text-[10px] break-all">
                        SKU: {row.sku}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-muted-foreground text-xs break-all">
                    {row.barcode || '—'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-bold font-mono text-base tracking-tight">
                    {row.currentQuantity}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground text-xs">
                  {row.lowStockThreshold}
                </TableCell>
                <TableCell className="text-center">
                  <StatusPill
                    tone={
                      row.currentQuantity === 0
                        ? 'destructive'
                        : row.isLowStock
                          ? 'warning'
                          : 'success'
                    }
                  >
                    {row.currentQuantity === 0
                      ? 'Out of stock'
                      : row.isLowStock
                        ? 'Low stock'
                        : 'Healthy'}
                  </StatusPill>
                </TableCell>
                <TableCell className="text-right">
                  <KisokButton
                    aria-label={`Adjust ${row.productName} ${row.variantName}`}
                    onClick={() => onAdjust(row)}
                    size="sm"
                    variant="outline"
                  >
                    Adjust
                  </KisokButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-col gap-3 border-border border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-muted-foreground text-xs">
            Showing {(currentPage - 1) * itemsPerPage + 1}–
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
          </p>
          <CompactPagination
            onPageChange={onPageChange}
            page={currentPage}
            totalPages={totalPages}
          />
        </div>
      ) : null}
    </div>
  );
}
