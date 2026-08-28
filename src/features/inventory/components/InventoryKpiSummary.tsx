'use client';

import { useMemo } from 'react';

import type { InventoryRecord } from '../types';

export interface InventoryKpiSummaryProps {
  rows: InventoryRecord[];
}

export function InventoryKpiSummary({ rows }: InventoryKpiSummaryProps) {
  const metrics = useMemo(() => {
    const totalVariants = rows.length;
    let totalStockUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const row of rows) {
      totalStockUnits += row.currentQuantity;
      if (row.isLowStock) {
        lowStockCount++;
      }
      if (row.currentQuantity === 0) {
        outOfStockCount++;
      }
    }

    return {
      totalVariants,
      totalStockUnits,
      lowStockCount,
      outOfStockCount,
    };
  }, [rows]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Metric 1: Total Variants */}
      <div className="rounded-lg border border-border bg-card/60 p-4 backdrop-blur-xs">
        <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
          Total variants
        </p>
        <p className="mt-1.5 font-bold font-mono text-2xl text-foreground sm:text-3xl">
          {metrics.totalVariants.toLocaleString()}
        </p>
      </div>

      {/* Metric 2: Total Units in Stock */}
      <div className="rounded-lg border border-border bg-card/60 p-4 backdrop-blur-xs">
        <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
          Total stock units
        </p>
        <p className="mt-1.5 font-bold font-mono text-2xl text-foreground sm:text-3xl">
          {metrics.totalStockUnits.toLocaleString()}
        </p>
      </div>

      {/* Metric 3: Low Stock Review */}
      <div
        className={`rounded-lg border p-4 backdrop-blur-xs transition-colors ${
          metrics.lowStockCount > 0
            ? 'border-amber-500/40 bg-amber-500/5'
            : 'border-border bg-card/60'
        }`}
      >
        <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
          Low stock review
        </p>
        <p
          className={`mt-1.5 font-bold font-mono text-2xl sm:text-3xl ${
            metrics.lowStockCount > 0 ? 'text-amber-500' : 'text-foreground'
          }`}
        >
          {metrics.lowStockCount.toLocaleString()}
        </p>
      </div>

      {/* Metric 4: Out of Stock */}
      <div
        className={`rounded-lg border p-4 backdrop-blur-xs transition-colors ${
          metrics.outOfStockCount > 0
            ? 'border-destructive/40 bg-destructive/5'
            : 'border-border bg-card/60'
        }`}
      >
        <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
          Out of stock
        </p>
        <p
          className={`mt-1.5 font-bold font-mono text-2xl sm:text-3xl ${
            metrics.outOfStockCount > 0 ? 'text-destructive' : 'text-foreground'
          }`}
        >
          {metrics.outOfStockCount.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
