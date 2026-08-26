'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  KisokButton,
  KisokDialog,
  KisokDialogContent,
  KisokDialogDescription,
  KisokDialogFooter,
  KisokDialogHeader,
  KisokDialogTitle,
  KisokInput,
  StatusPill,
} from '@/shared/ui';

import { storeSettingsRepository } from '../repositories';
import type { StoreSettingsRecord } from '../types';

export function StoreSettingsPanel() {
  const [settings, setSettings] = useState<StoreSettingsRecord | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [threshold, setThreshold] = useState('');
  const [resetSeconds, setResetSeconds] = useState('');
  const [timezone, setTimezone] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await storeSettingsRepository.get();
      setSettings(next);
      setStoreName(next.storeName);
      setThreshold(String(next.globalLowStockThreshold));
      setResetSeconds(String(next.customerSuccessResetSeconds));
      setTimezone(next.storeTimezone);
    } catch {
      setError('Store Settings could not be loaded. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function saveSettings() {
    const globalLowStockThreshold = Number(threshold);
    const customerSuccessResetSeconds = Number(resetSeconds);
    if (
      !(storeName.trim() && timezone.trim() && Number.isInteger(globalLowStockThreshold)) ||
      globalLowStockThreshold < 0 ||
      !Number.isInteger(customerSuccessResetSeconds) ||
      customerSuccessResetSeconds < 0
    ) {
      setError('Enter a store name, timezone, and non-negative integer settings.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const next = await storeSettingsRepository.update({
        storeName: storeName.trim(),
        globalLowStockThreshold,
        customerSuccessResetSeconds,
        storeTimezone: timezone.trim(),
      });
      setSettings(next);
      setEditOpen(false);
    } catch {
      setError('Store Settings could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1.18fr_0.82fr]">
      <div className="border border-border bg-card p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.2em]">
              Store settings / hosted data
            </p>
            <h1 className="mt-2 font-black text-5xl tracking-[-0.08em] sm:text-6xl">
              Store defaults
            </h1>
          </div>
          <KisokButton disabled={!settings} onClick={() => setEditOpen(true)} variant="outline">
            Edit settings
          </KisokButton>
        </div>

        {loading ? (
          <p className="mt-8 text-muted-foreground text-sm" role="status">
            Loading Store Settings…
          </p>
        ) : error && !settings ? (
          <div className="mt-8 grid gap-3" role="alert">
            <p className="text-destructive text-sm">{error}</p>
            <KisokButton onClick={() => void refresh()} variant="outline">
              Try again
            </KisokButton>
          </div>
        ) : settings ? (
          <div className="mt-8 divide-y divide-border border-border border-y">
            {[
              ['Store identity', settings.storeName],
              ['Timezone', settings.storeTimezone],
              ['Low-stock threshold', settings.globalLowStockThreshold],
              ['Customer success reset', settings.customerSuccessResetSeconds],
            ].map(([label, value]) => (
              <div
                className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                key={label}
              >
                <span className="text-muted-foreground text-sm">{label}</span>
                <span className="font-mono text-xs uppercase tracking-[0.12em]">{value}</span>
              </div>
            ))}
          </div>
        ) : null}
        {error && settings ? (
          <p className="mt-4 text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex min-h-72 flex-col justify-between bg-primary p-6 text-primary-foreground sm:p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em]">Connection status</p>
        <div>
          <p className="font-black text-5xl tracking-[-0.08em]">HOSTED</p>
          <div className="mt-3 flex items-center gap-2">
            <StatusPill>Hosted Supabase</StatusPill>
          </div>
        </div>
      </div>

      <KisokDialog onOpenChange={setEditOpen} open={editOpen}>
        <KisokDialogContent>
          <KisokDialogHeader>
            <KisokDialogTitle>Edit Store Settings</KisokDialogTitle>
            <KisokDialogDescription>
              Changes persist to the Lean V2 store settings singleton.
            </KisokDialogDescription>
          </KisokDialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-2" htmlFor="store-identity">
              <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Store name
              </span>
              <KisokInput
                id="store-identity"
                onChange={(event) => setStoreName(event.target.value)}
                value={storeName}
              />
            </label>
            <label className="grid gap-2" htmlFor="low-stock-threshold">
              <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Low-stock threshold
              </span>
              <KisokInput
                id="low-stock-threshold"
                min="0"
                onChange={(event) => setThreshold(event.target.value)}
                type="number"
                value={threshold}
              />
            </label>
            <label className="grid gap-2" htmlFor="order-reset">
              <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Customer success reset seconds
              </span>
              <KisokInput
                id="order-reset"
                min="0"
                onChange={(event) => setResetSeconds(event.target.value)}
                type="number"
                value={resetSeconds}
              />
            </label>
            <label className="grid gap-2" htmlFor="store-timezone">
              <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                Timezone
              </span>
              <KisokInput
                id="store-timezone"
                onChange={(event) => setTimezone(event.target.value)}
                value={timezone}
              />
            </label>
          </div>
          <KisokDialogFooter>
            <KisokButton disabled={saving} onClick={() => setEditOpen(false)} variant="quiet">
              Cancel
            </KisokButton>
            <KisokButton disabled={saving} onClick={() => void saveSettings()}>
              {saving ? 'Saving…' : 'Save settings'}
            </KisokButton>
          </KisokDialogFooter>
        </KisokDialogContent>
      </KisokDialog>
    </section>
  );
}
