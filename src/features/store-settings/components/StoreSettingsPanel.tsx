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
  KisokInput,
} from '@/shared/ui';

import { storeSettingsRepository } from '../repositories';
import { storeSettingsSchema } from '../schemas/store-settings.schema';

export function StoreSettingsPanel({
  onAction = () => undefined,
}: {
  onAction?: (message: string) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [settings, setSettings] = useState(() => ({ ...storeSettingsRepository.get() }));
  const [lowStockThresholdDraft, setLowStockThresholdDraft] = useState(settings.lowStockThreshold);
  const [orderResetDraft, setOrderResetDraft] = useState(settings.orderReset);
  const [storeIdentityDraft, setStoreIdentityDraft] = useState(settings.storeIdentity);

  function openEditor() {
    setLowStockThresholdDraft(settings.lowStockThreshold);
    setOrderResetDraft(settings.orderReset);
    setStoreIdentityDraft(settings.storeIdentity);
    setEditOpen(true);
  }

  function saveLocalSettings() {
    const validation = storeSettingsSchema.safeParse({
      lowStockThreshold: lowStockThresholdDraft,
      orderReset: orderResetDraft,
      storeIdentity: storeIdentityDraft,
    });
    if (!validation.success) {
      return;
    }
    setSettings((current) => ({ ...current, ...validation.data }));
    setEditOpen(false);
    onAction('Local store settings saved');
  }

  const settingRows = [
    ['Store identity', settings.storeIdentity],
    ['Timezone', settings.timezone],
    ['Low-stock threshold', settings.lowStockThreshold],
    ['Order reset', settings.orderReset],
  ];

  return (
    <section className="grid gap-4 lg:grid-cols-[1.18fr_0.82fr]">
      <div className="border border-[#292929] bg-[#181818] p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[#969694] text-[10px] uppercase tracking-[0.2em]">
              Store settings / local workspace
            </p>
            <h1 className="mt-2 font-black text-5xl text-[#f0f0ed] tracking-[-0.08em] sm:text-6xl">
              Store defaults
            </h1>
          </div>
          <KisokButton onClick={openEditor} variant="outline">
            Edit local settings
          </KisokButton>
        </div>
        <div className="mt-8 divide-y divide-[#303030] border-[#303030] border-y">
          {settingRows.map(([label, value]) => (
            <div
              className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
              key={label}
            >
              <span className="text-[#a0a09d] text-sm">{label}</span>
              <span className="font-mono text-[#ecece8] text-xs uppercase tracking-[0.12em]">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex min-h-72 flex-col justify-between bg-[#e6e6e2] p-6 text-[#141414] sm:p-8">
        <p className="font-mono text-[#595958] text-[10px] uppercase tracking-[0.2em]">
          Connection status
        </p>
        <div>
          <p className="font-black text-5xl tracking-[-0.08em]">LOCAL</p>
          <p className="mt-3 max-w-xs text-[#4e4e4c] text-sm leading-6">
            The settings layout is ready. Store configuration will persist once the integration
            phase starts.
          </p>
        </div>
      </div>
      <KisokDialog onOpenChange={setEditOpen} open={editOpen}>
        <KisokDialogContent>
          <KisokDialogHeader>
            <p className="font-mono text-[#969694] text-[10px] uppercase tracking-[0.2em]">
              Store configuration / local action
            </p>
            <KisokDialogTitle>Edit store settings</KisokDialogTitle>
            <KisokDialogDescription>
              This draft changes only the local display state. The eventual store-settings adapter
              will reuse the same fields when persistence is approved.
            </KisokDialogDescription>
          </KisokDialogHeader>
          <label className="grid gap-2" htmlFor="store-identity">
            <span className="font-mono text-[#c2c2be] text-[10px] uppercase tracking-[0.16em]">
              Store identity
            </span>
            <KisokInput
              className="w-full border border-[#4c4c4c] bg-[#111111] p-3 text-[#f0f0ed] text-sm outline-none placeholder:text-[#6d6d6a] focus:border-[#e7e7e4]"
              id="store-identity"
              onChange={(event) => setStoreIdentityDraft(event.target.value)}
              value={storeIdentityDraft}
            />
          </label>
          <label className="grid gap-2" htmlFor="low-stock-threshold">
            <span className="font-mono text-[#c2c2be] text-[10px] uppercase tracking-[0.16em]">
              Low-stock threshold
            </span>
            <KisokInput
              className="w-full border border-[#4c4c4c] bg-[#111111] p-3 text-[#f0f0ed] text-sm outline-none placeholder:text-[#6d6d6a] focus:border-[#e7e7e4]"
              id="low-stock-threshold"
              onChange={(event) => setLowStockThresholdDraft(event.target.value)}
              value={lowStockThresholdDraft}
            />
          </label>
          <label className="grid gap-2" htmlFor="order-reset">
            <span className="font-mono text-[#c2c2be] text-[10px] uppercase tracking-[0.16em]">
              Order reset
            </span>
            <KisokInput
              className="w-full border border-[#4c4c4c] bg-[#111111] p-3 text-[#f0f0ed] text-sm outline-none placeholder:text-[#6d6d6a] focus:border-[#e7e7e4]"
              id="order-reset"
              onChange={(event) => setOrderResetDraft(event.target.value)}
              value={orderResetDraft}
            />
          </label>
          <KisokDialogFooter>
            <KisokButton onClick={() => setEditOpen(false)} variant="quiet">
              Cancel
            </KisokButton>
            <KisokButton disabled={!storeIdentityDraft.trim()} onClick={saveLocalSettings}>
              Save local settings
            </KisokButton>
          </KisokDialogFooter>
        </KisokDialogContent>
      </KisokDialog>
    </section>
  );
}
