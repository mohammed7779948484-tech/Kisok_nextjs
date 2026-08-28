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
  itemsPerPage: number;
  onAdjust: (row: InventoryRecord) => void;
  onPageChange: (page: number) => void;
  rows: InventoryRecord[];
  totalItems: number;
}

export function InventoryStockTable({
  currentPage,
  itemsPerPage,
  onAdjust,
  onPageChange,
  rows,
  totalItems,
}: InventoryStockTableProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-14 text-center">
        <p className="font-semibold text-foreground text-sm">
          No inventory records match your criteria
        </p>
        <p className="mt-1 text-muted-foreground text-xs">
          Try clearing search filters or check your catalog variants.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border border-border bg-card">
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
                    <p className="font-bold text-foreground text-sm">{row.productName}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-block rounded-md border border-border bg-muted/60 px-2 py-0.5 font-medium text-foreground text-xs">
                        {row.variantName}
                      </span>
                      <span className="font-mono text-muted-foreground text-[10px]">
                        SKU: {row.sku}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-muted-foreground text-xs">
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
                    className={
                      row.isLowStock
                        ? 'border-destructive/80 bg-destructive/10 text-destructive font-semibold'
                        : undefined
                    }
                  >
                    {row.isLowStock ? 'Review' : 'Healthy'}
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
        <div className="flex items-center justify-between border-border border-t pt-4">
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
