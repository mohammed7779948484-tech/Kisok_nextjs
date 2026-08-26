'use client';

import { useCallback, useEffect, useState } from 'react';

import { KisokButton, StatusPill } from '@/shared/ui';

import { catalogTaxonomyRepository } from '../repositories';
import type { OptionTypeRecord } from '../types';

export function OptionLibraryPanel() {
  const [options, setOptions] = useState<OptionTypeRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <KisokButton onClick={() => void refresh()} variant="outline">
          Refresh
        </KisokButton>
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
                <StatusPill
                  className={
                    selectedOption.isActive ? undefined : 'border-destructive text-destructive'
                  }
                >
                  {selectedOption.isActive ? 'Active' : 'Inactive'}
                </StatusPill>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {selectedOption.values.map((value) => (
                  <StatusPill
                    className={value.isActive ? undefined : 'border-destructive text-destructive'}
                    key={value.id}
                  >
                    {value.value}
                  </StatusPill>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
