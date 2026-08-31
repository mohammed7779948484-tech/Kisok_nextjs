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

import type { InventoryHistoryRecord } from '../types';

export interface InventoryHistoryTableProps {
  currentPage: number;
  error?: string | null;
  isLoading?: boolean;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onRetry?: () => void;
  rows: InventoryHistoryRecord[];
  totalItems: number;
}

function formatAdjustmentType(type?: string): string {
  if (!type) return '—';
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
  error = null,
  isLoading = false,
  itemsPerPage,
  onPageChange,
  onRetry,
  rows,
  totalItems,
}: InventoryHistoryTableProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center" role="status">
        <p className="text-muted-foreground text-sm">Loading adjustment history…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-10 text-center text-destructive"
        role="alert"
      >
        <p className="font-semibold text-sm">Adjustment history could not be loaded</p>
        <p className="mt-1 text-xs">{error}</p>
        {onRetry ? (
          <KisokButton className="mt-4" onClick={onRetry} size="sm" type="button" variant="outline">
            Retry loading history
          </KisokButton>
        ) : null}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/25 px-5 py-14 text-center">
        <p className="font-semibold text-foreground text-sm">
          No adjustment history records available
        </p>
        <p className="mt-1 text-muted-foreground text-xs">
          Audit records appear here whenever stock adjustments or orders take place.
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
              <TableHead className="w-[20%] font-mono text-[10px] uppercase tracking-[0.16em]">
                Timestamp
              </TableHead>
              <TableHead className="w-[30%] font-mono text-[10px] uppercase tracking-[0.16em]">
                Product & Variant
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-[0.16em]">
                Type
              </TableHead>
              <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.16em]">
                Delta
              </TableHead>
              <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.16em]">
                Before → After
              </TableHead>
              <TableHead className="w-[20%] font-mono text-[10px] uppercase tracking-[0.16em]">
                Reason
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const delta = row.delta ?? 0;
              const type = row.type || '';
              const prevQuantity = row.quantityBefore ?? 0;
              const nextQuantity = row.quantityAfter ?? 0;

              const isPositive = delta > 0;
              const formattedDate = row.createdAt
                ? new Date(row.createdAt).toLocaleString(undefined, {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : '—';

              return (
                <TableRow
                  className="border-border transition-colors hover:bg-muted/40"
                  key={row.id}
                >
                  <TableCell className="font-mono text-muted-foreground text-xs whitespace-nowrap">
                    {formattedDate}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-bold text-foreground text-sm">{row.productName}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-block rounded-md border border-border bg-muted/60 px-1.5 py-0.2 text-[11px] font-medium text-foreground">
                          {row.variantName}
                        </span>
                        <span className="font-mono text-muted-foreground text-[10px]">
                          SKU: {row.sku}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusPill tone="neutral">{formatAdjustmentType(type)}</StatusPill>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-sm">
                    <span className={isPositive ? 'text-success' : 'text-destructive'}>
                      {isPositive ? `+${delta}` : delta}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground text-xs whitespace-nowrap">
                    {prevQuantity} →{' '}
                    <span className="font-bold text-foreground">{nextQuantity}</span>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground text-xs">
                    {row.reason || '—'}
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
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} events
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
