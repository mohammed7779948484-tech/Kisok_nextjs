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

import { catalogTaxonomyRepository } from '../repositories';
import type { OptionTypeRecord } from '../types';

export function OptionLibraryPanel() {
  const [options, setOptions] = useState<OptionTypeRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [typeName, setTypeName] = useState('');
  const [valueDialogOpen, setValueDialogOpen] = useState(false);
  const [valueText, setValueText] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await catalogTaxonomyRepository.listOptionTypes();
      setOptions(records);
      setSelectedId((current) => current || records[0]?.id || '');
    } catch {
      setError('Option library could not be loaded. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedOption = options.find((option) => option.id === selectedId) ?? options[0];

  async function createType() {
    const name = typeName.trim();
    if (!name) return;
    setSaving(true);
    setError(null);
    try {
      await catalogTaxonomyRepository.createOptionType({ name });
      setTypeName('');
      setTypeDialogOpen(false);
      await refresh();
    } catch {
      setError('The Option Type could not be created. Check for duplicate or invalid data.');
    } finally {
      setSaving(false);
    }
  }

  async function createValue() {
    const value = valueText.trim();
    if (!(value && selectedOption)) return;
    setSaving(true);
    setError(null);
    try {
      await catalogTaxonomyRepository.createOptionValue({
        optionTypeId: selectedOption.id,
        value,
      });
      setValueText('');
      setValueDialogOpen(false);
      await refresh();
    } catch {
      setError('The Option Value could not be created. Check for duplicate or invalid data.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleValue(id: string, isActive: boolean) {
    setError(null);
    try {
      await catalogTaxonomyRepository.updateOptionValue(id, { isActive: !isActive });
      await refresh();
    } catch {
      setError('The Option Value could not be updated.');
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
            Catalog masters / hosted data
          </p>
          <h1 className="mt-2 font-black text-5xl tracking-[-0.08em] sm:text-6xl">
            Option library
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground text-sm leading-6">
            Maintain reusable Option Types and their Values for product variants.
          </p>
        </div>
        <div className="flex gap-2">
          <KisokButton onClick={() => setTypeDialogOpen(true)} variant="outline">
            Add Option Type
          </KisokButton>
          <KisokButton onClick={() => void refresh()} variant="outline">
            Refresh
          </KisokButton>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm" role="status">
          Loading option library…
        </p>
      ) : error ? (
        <div className="grid gap-3" role="alert">
          <p className="text-destructive text-sm">{error}</p>
          <KisokButton onClick={() => void refresh()} variant="outline">
            Try again
          </KisokButton>
        </div>
      ) : options.length === 0 ? (
        <p className="text-muted-foreground text-sm">No Option Types are available.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="border border-border bg-card p-5">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
              Option Types
            </p>
            <div className="mt-4 space-y-2">
              {options.map((option) => (
                <button
                  className={`flex w-full items-center justify-between border px-3 py-2 text-left text-sm ${option.id === selectedId ? 'border-foreground bg-muted' : 'border-border bg-transparent'}`}
                  key={option.id}
                  onClick={() => setSelectedId(option.id)}
                  type="button"
                >
                  <span>{option.name}</span>
                  <span className="font-mono text-xs">{option.values.length}</span>
                </button>
              ))}
            </div>
          </div>
          {selectedOption ? (
            <div className="border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
                    Values
                  </p>
                  <h2 className="mt-1 font-semibold text-lg">{selectedOption.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill
                    className={
                      selectedOption.isActive ? undefined : 'border-destructive text-destructive'
                    }
                  >
                    {selectedOption.isActive ? 'Active' : 'Inactive'}
                  </StatusPill>
                  <KisokButton onClick={() => setValueDialogOpen(true)} size="sm" variant="outline">
                    Add Value
                  </KisokButton>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {selectedOption.values.map((value) => (
                  <div className="flex items-center gap-2" key={value.id}>
                    <StatusPill
                      className={value.isActive ? undefined : 'border-destructive text-destructive'}
                    >
                      {value.value}
                    </StatusPill>
                    <KisokButton
                      aria-label={`${value.isActive ? 'Deactivate' : 'Activate'} ${value.value}`}
                      onClick={() => void toggleValue(value.id, value.isActive)}
                      size="sm"
                      variant="quiet"
                    >
                      {value.isActive ? 'Deactivate' : 'Activate'}
                    </KisokButton>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <KisokDialog onOpenChange={setTypeDialogOpen} open={typeDialogOpen}>
        <KisokDialogContent>
          <KisokDialogHeader>
            <KisokDialogTitle>Add Option Type</KisokDialogTitle>
            <KisokDialogDescription>Create a reusable hosted Option Type.</KisokDialogDescription>
          </KisokDialogHeader>
          <label className="grid gap-2" htmlFor="option-type-name">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
              Option Type name
            </span>
            <KisokInput
              id="option-type-name"
              onChange={(event) => setTypeName(event.target.value)}
              value={typeName}
            />
          </label>
          <KisokDialogFooter>
            <KisokButton disabled={saving} onClick={() => setTypeDialogOpen(false)} variant="quiet">
              Cancel
            </KisokButton>
            <KisokButton disabled={saving || !typeName.trim()} onClick={() => void createType()}>
              {saving ? 'Saving…' : 'Save Option Type'}
            </KisokButton>
          </KisokDialogFooter>
        </KisokDialogContent>
      </KisokDialog>

      <KisokDialog onOpenChange={setValueDialogOpen} open={valueDialogOpen}>
        <KisokDialogContent>
          <KisokDialogHeader>
            <KisokDialogTitle>Add Option Value</KisokDialogTitle>
            <KisokDialogDescription>
              Add a Value scoped to the selected Option Type.
            </KisokDialogDescription>
          </KisokDialogHeader>
          <label className="grid gap-2" htmlFor="option-value">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
              Option Value
            </span>
            <KisokInput
              id="option-value"
              onChange={(event) => setValueText(event.target.value)}
              value={valueText}
            />
          </label>
          <KisokDialogFooter>
            <KisokButton
              disabled={saving}
              onClick={() => setValueDialogOpen(false)}
              variant="quiet"
            >
              Cancel
            </KisokButton>
            <KisokButton disabled={saving || !valueText.trim()} onClick={() => void createValue()}>
              {saving ? 'Saving…' : 'Save Option Value'}
            </KisokButton>
          </KisokDialogFooter>
        </KisokDialogContent>
      </KisokDialog>
    </section>
  );
}
