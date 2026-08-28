'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CompactPagination, StatusPill } from '@/shared/ui';

import type { InventoryHistoryRecord } from '../types';

export interface InventoryHistoryTableProps {
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  rows: InventoryHistoryRecord[];
  totalItems: number;
}

function formatAdjustmentType(type: string): string {
  switch (type) {
    case 'stock_received':
      return 'Stock received';
    case 'manual_increase':
      return 'Manual increase';
    case 'manual_decrease':
      return 'Manual decrease';
    case 'damaged_or_expired':
      return 'Damaged or expired';
    case 'order_deduction':
      return 'Order deduction';
    case 'order_cancellation_restoration':
      return 'Cancellation restored';
    case 'initial_stock':
      return 'Initial stock';
    default:
      return type.replaceAll('_', ' ');
  }
}

export function InventoryHistoryTable({
  currentPage,
  itemsPerPage,
  onPageChange,
  rows,
  totalItems,
}: InventoryHistoryTableProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/25 px-5 py-14 text-center">
        <p className="font-semibold text-foreground text-sm">
          No adjustment history records available
        </p>
        <p className="mt-1 text-muted-foreground text-xs">
          Immutable audit records appear here whenever stock adjustments or orders take place.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-[30%] font-mono text-[10px] uppercase tracking-[0.16em]">
                Variant & Product
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-[0.16em]">
                Type
              </TableHead>
              <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.16em]">
                Change
              </TableHead>
              <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.16em]">
                Result
              </TableHead>
              <TableHead className="w-[28%] font-mono text-[10px] uppercase tracking-[0.16em]">
                Reason
              </TableHead>
              <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.16em]">
                Date
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isPositive = row.delta > 0;
              const formattedDate = new Date(row.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <TableRow
                  className="border-border transition-colors hover:bg-muted/40"
                  key={row.id}
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
                    <StatusPill className="font-mono text-[10px]">
                      {formatAdjustmentType(row.type)}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`font-bold font-mono text-sm ${
                        isPositive ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      {isPositive ? `+${row.delta}` : row.delta}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-bold font-mono text-foreground text-sm">
                      {row.quantityAfter}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {row.reason || '—'}
                    </p>
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground text-xs">
                    {formattedDate}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-col gap-3 border-border border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-muted-foreground text-xs">
            Showing {(currentPage - 1) * itemsPerPage + 1}–
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
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
