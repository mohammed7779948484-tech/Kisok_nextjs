'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { InventoryAdjustmentInput } from '@/infrastructure/supabase/inventory/adapter';
import {
  KisokButton,
  KisokDialog,
  KisokDialogContent,
  KisokDialogDescription,
  KisokDialogFooter,
  KisokDialogHeader,
  KisokDialogTitle,
  KisokInput,
  KisokTextarea,
  StatusPill,
} from '@/shared/ui';

import { inventoryRepository } from '../repositories';
import type { InventoryRecord } from '../types';

const adjustmentTypes: Array<{
  value: InventoryAdjustmentInput['adjustmentType'];
  label: string;
}> = [
  { value: 'stock_received', label: 'Stock received' },
  { value: 'manual_increase', label: 'Manual increase' },
  { value: 'manual_decrease', label: 'Manual decrease' },
  { value: 'damaged_or_expired', label: 'Damaged or expired' },
];

export function InventoryPanel() {
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [setQuantityOpen, setSetQuantityOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] =
    useState<InventoryAdjustmentInput['adjustmentType']>('stock_received');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantityChange, setQuantityChange] = useState('1');
  const [finalQuantity, setFinalQuantity] = useState('0');
  const [reason, setReason] = useState('');
  const [inventoryRows, setInventoryRows] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [setQuantitySubmitting, setSetQuantitySubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await inventoryRepository.list();
      setInventoryRows(rows);
      setSelectedVariantId((current) => current || rows[0]?.variantId || '');
    } catch {
      setError('Inventory could not be loaded. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submitAdjustment() {
    const delta = Number(quantityChange);
    if (!(selectedVariantId && Number.isInteger(delta)) || delta === 0 || !reason.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await inventoryRepository.applyAdjustment({
        adjustmentType,
        quantityChange: delta,
        reason: reason.trim(),
        variantId: selectedVariantId,
      });
      setReason('');
      setQuantityChange('1');
      setAdjustmentOpen(false);
      await refresh();
    } catch {
      setError('The inventory adjustment was rejected. Review the quantity and reason.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSetQuantity() {
    const quantity = Number(finalQuantity);
    if (!(selectedVariantId && Number.isInteger(quantity)) || quantity < 0 || !reason.trim())
      return;

    setSetQuantitySubmitting(true);
    setError(null);
    try {
      await inventoryRepository.setQuantity({
        finalQuantity: quantity,
        reason: reason.trim(),
        variantId: selectedVariantId,
      });
      setReason('');
      setSetQuantityOpen(false);
      await refresh();
    } catch {
      setError('The final quantity was rejected. Review the quantity and reason.');
    } finally {
      setSetQuantitySubmitting(false);
    }
  }

  return (
    <section className="border border-border bg-card p-5 text-card-foreground sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.2em]">
            Inventory ledger / hosted data
          </p>
          <h1 className="mt-2 font-black text-5xl tracking-[-0.08em] sm:text-6xl">Stock ledger</h1>
        </div>
        <KisokButton
          disabled={loading || inventoryRows.length === 0}
          onClick={() => setAdjustmentOpen(true)}
          variant="outline"
        >
          Record adjustment
        </KisokButton>
      </div>

      {loading ? (
        <p className="mt-6 text-muted-foreground text-sm" role="status">
          Loading inventory…
        </p>
      ) : error && inventoryRows.length === 0 ? (
        <div className="mt-6 grid gap-3" role="alert">
          <p className="text-destructive text-sm">{error}</p>
          <KisokButton onClick={() => void refresh()} variant="outline">
            Try again
          </KisokButton>
        </div>
      ) : inventoryRows.length === 0 ? (
        <p className="mt-6 text-muted-foreground text-sm">No inventory records are available.</p>
      ) : (
        <div className="mt-6 divide-y divide-border border-border border-y">
          {inventoryRows.map((row) => (
            <article
              className="grid gap-3 py-5 sm:grid-cols-[1.2fr_0.6fr_1fr_auto] sm:items-center"
              key={row.variantId}
            >
              <div>
                <p className="font-bold">{row.productName}</p>
                <p className="mt-1 font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                  {row.sku} · Threshold {row.lowStockThreshold}
                </p>
              </div>
              <p className="font-black text-3xl tracking-[-0.06em]">{row.currentQuantity}</p>
              <p className="text-muted-foreground text-sm">
                {row.barcode ? `Barcode ${row.barcode}` : 'No barcode'}
              </p>
              <div className="flex items-center gap-2">
                <StatusPill
                  className={row.isLowStock ? 'border-destructive text-destructive' : undefined}
                >
                  {row.isLowStock ? 'Review' : 'Healthy'}
                </StatusPill>
                <KisokButton
                  onClick={() => {
                    setSelectedVariantId(row.variantId);
                    setFinalQuantity(String(row.currentQuantity));
                    setReason('');
                    setSetQuantityOpen(true);
                  }}
                  size="sm"
                  variant="quiet"
                >
                  Set quantity
                </KisokButton>
              </div>
            </article>
          ))}
        </div>
      )}

      {error && inventoryRows.length > 0 ? (
        <p className="mt-4 text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <KisokDialog onOpenChange={setSetQuantityOpen} open={setQuantityOpen}>
        <KisokDialogContent>
          <KisokDialogHeader>
            <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.2em]">
              Inventory control / ledger correction
            </p>
            <KisokDialogTitle>Set final quantity</KisokDialogTitle>
            <KisokDialogDescription>
              Set Quantity writes the difference to the Lean V2 ledger. A reason is required.
            </KisokDialogDescription>
          </KisokDialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-2" htmlFor="inventory-final-quantity">
              <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Final quantity
              </span>
              <KisokInput
                id="inventory-final-quantity"
                inputMode="numeric"
                min="0"
                onChange={(event) => setFinalQuantity(event.target.value)}
                type="number"
                value={finalQuantity}
              />
            </label>
            <label className="grid gap-2" htmlFor="inventory-set-quantity-reason">
              <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Reason
              </span>
              <KisokTextarea
                className="min-h-28 w-full resize-y"
                id="inventory-set-quantity-reason"
                onChange={(event) => setReason(event.target.value)}
                placeholder="Describe the stock count or correction."
                value={reason}
              />
            </label>
          </div>
          <KisokDialogFooter>
            <KisokButton
              disabled={setQuantitySubmitting}
              onClick={() => setSetQuantityOpen(false)}
              variant="quiet"
            >
              Cancel
            </KisokButton>
            <KisokButton
              disabled={setQuantitySubmitting || !selectedVariantId || !reason.trim()}
              onClick={() => void submitSetQuantity()}
            >
              {setQuantitySubmitting ? 'Saving…' : 'Save quantity'}
            </KisokButton>
          </KisokDialogFooter>
        </KisokDialogContent>
      </KisokDialog>

      <KisokDialog onOpenChange={setAdjustmentOpen} open={adjustmentOpen}>
        <KisokDialogContent>
          <KisokDialogHeader>
            <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.2em]">
              Inventory control / transactional adjustment
            </p>
            <KisokDialogTitle>Record stock adjustment</KisokDialogTitle>
            <KisokDialogDescription>
              Every change is written through the Lean V2 inventory ledger. A reason is required for
              Admin adjustments.
            </KisokDialogDescription>
          </KisokDialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-2" htmlFor="inventory-adjustment-variant">
              <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Variant
              </span>
              <Select
                onValueChange={(value) => setSelectedVariantId(value ?? '')}
                value={selectedVariantId}
              >
                <SelectTrigger id="inventory-adjustment-variant">
                  <SelectValue placeholder="Select a variant" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryRows.map((row) => (
                    <SelectItem key={row.variantId} value={row.variantId}>
                      {row.productName} · {row.sku}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-2" htmlFor="inventory-adjustment-type">
              <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Adjustment type
              </span>
              <Select
                onValueChange={(value) =>
                  setAdjustmentType(value as InventoryAdjustmentInput['adjustmentType'])
                }
                value={adjustmentType}
              >
                <SelectTrigger id="inventory-adjustment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {adjustmentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-2" htmlFor="inventory-adjustment-quantity">
              <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Quantity change
              </span>
              <KisokInput
                id="inventory-adjustment-quantity"
                inputMode="numeric"
                onChange={(event) => setQuantityChange(event.target.value)}
                type="number"
                value={quantityChange}
              />
            </label>
            <label className="grid gap-2" htmlFor="inventory-adjustment-reason">
              <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Reason
              </span>
              <KisokTextarea
                className="min-h-28 w-full resize-y"
                id="inventory-adjustment-reason"
                onChange={(event) => setReason(event.target.value)}
                placeholder="Describe the stock count or received delivery."
                value={reason}
              />
            </label>
          </div>
          <KisokDialogFooter>
            <KisokButton
              disabled={submitting}
              onClick={() => setAdjustmentOpen(false)}
              variant="quiet"
            >
              Cancel
            </KisokButton>
            <KisokButton
              disabled={submitting || !selectedVariantId || !reason.trim()}
              onClick={() => void submitAdjustment()}
            >
              {submitting ? 'Saving…' : 'Save adjustment'}
            </KisokButton>
          </KisokDialogFooter>
        </KisokDialogContent>
      </KisokDialog>
    </section>
  );
}
