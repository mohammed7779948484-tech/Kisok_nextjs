'use client';

import { useState } from 'react';

import {
  KisokButton,
  KisokDialog,
  KisokDialogContent,
  KisokDialogDescription,
  KisokDialogFooter,
  KisokDialogHeader,
  KisokDialogTitle,
  KisokTextarea,
  StatusPill,
} from '@/shared/ui';

import { inventoryRepository } from '../repositories';

export function InventoryPanel({
  onAction = () => undefined,
}: {
  onAction?: (message: string) => void;
}) {
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [reason, setReason] = useState('');
  const inventoryRows = inventoryRepository.list();

  function stageAdjustment() {
    onAction('Inventory adjustment staged locally');
    setReason('');
    setAdjustmentOpen(false);
  }

  return (
    <section className="border border-[#292929] bg-[#181818] p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-[#303030] border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[#969694] text-[10px] uppercase tracking-[0.2em]">
            Inventory ledger / local workspace
          </p>
          <h1 className="mt-2 font-black text-5xl text-[#f0f0ed] tracking-[-0.08em] sm:text-6xl">
            Stock ledger
          </h1>
        </div>
        <KisokButton onClick={() => setAdjustmentOpen(true)} variant="outline">
          Record adjustment
        </KisokButton>
      </div>
      <div className="mt-6 divide-y divide-[#303030] border-[#303030] border-y">
        {inventoryRows.map((row) => {
          const atRisk = row.available <= row.threshold;
          return (
            <article
              className="grid gap-3 py-5 sm:grid-cols-[1.2fr_0.6fr_1fr_auto] sm:items-center"
              key={row.product}
            >
              <div>
                <p className="font-bold text-[#eeeeeb]">{row.product}</p>
                <p className="mt-1 font-mono text-[#838380] text-[10px] uppercase tracking-[0.16em]">
                  Threshold {row.threshold}
                </p>
              </div>
              <p className="font-black text-3xl tracking-[-0.06em]">
                {String(row.available).padStart(2, '0')}
              </p>
              <p className="text-[#a1a19e] text-sm">{row.lastAction}</p>
              <StatusPill>{atRisk ? 'Review' : 'Healthy'}</StatusPill>
            </article>
          );
        })}
      </div>
      <KisokDialog onOpenChange={setAdjustmentOpen} open={adjustmentOpen}>
        <KisokDialogContent>
          <KisokDialogHeader>
            <p className="font-mono text-[#969694] text-[10px] uppercase tracking-[0.2em]">
              Inventory control / local action
            </p>
            <KisokDialogTitle>Record stock adjustment</KisokDialogTitle>
            <KisokDialogDescription>
              Add a clear reason before staging a local adjustment. No inventory record is written
              in this phase.
            </KisokDialogDescription>
          </KisokDialogHeader>
          <label className="grid gap-2" htmlFor="inventory-adjustment-reason">
            <span className="font-mono text-[#c2c2be] text-[10px] uppercase tracking-[0.16em]">
              Adjustment reason
            </span>
            <KisokTextarea
              className="min-h-28 w-full resize-y border border-[#4c4c4c] bg-[#111111] p-3 text-[#f0f0ed] text-sm outline-none placeholder:text-[#6d6d6a] focus:border-[#e7e7e4]"
              id="inventory-adjustment-reason"
              onChange={(event) => setReason(event.target.value)}
              placeholder="Describe the stock count or received delivery."
              value={reason}
            />
          </label>
          <KisokDialogFooter>
            <KisokButton onClick={() => setAdjustmentOpen(false)} variant="quiet">
              Cancel
            </KisokButton>
            <KisokButton disabled={!reason.trim()} onClick={stageAdjustment}>
              Stage local adjustment
            </KisokButton>
          </KisokDialogFooter>
        </KisokDialogContent>
      </KisokDialog>
    </section>
  );
}
