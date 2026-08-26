'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusPill } from '@/shared/ui';

type OptionType = {
  id: string;
  name: string;
  values: string[];
};

const initialOptions: OptionType[] = [
  { id: 'flavor', name: 'Flavor', values: ['Berry', 'Mint'] },
  { id: 'size', name: 'Size', values: ['Small', 'Large'] },
];

export function OptionLibraryPanel() {
  const [options, setOptions] = useState(initialOptions);
  const [selectedId, setSelectedId] = useState(initialOptions[0].id);
  const [draft, setDraft] = useState('');

  const selectedOption = options.find((option) => option.id === selectedId) ?? options[0];

  function addValue() {
    const normalized = draft.trim();
    if (
      !normalized ||
      selectedOption.values.some((value) => value.toLowerCase() === normalized.toLowerCase())
    )
      return;
    setOptions((current) =>
      current.map((option) =>
        option.id === selectedOption.id
          ? { ...option, values: [...option.values, normalized] }
          : option,
      ),
    );
    setDraft('');
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
            Catalog masters
          </p>
          <h1 className="mt-2 font-black text-5xl tracking-[-0.08em] sm:text-6xl">
            Option library
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground text-sm leading-6">
            Maintain reusable Option Types and their Values once, then select them across product
            variants.
          </p>
        </div>
        <StatusPill>Shared master data</StatusPill>
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="border border-border bg-card p-5">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
            Option Types
          </p>
          <div className="mt-4 space-y-2">
            {options.map((option) => (
              <Button
                className="w-full justify-between rounded-none"
                key={option.id}
                onClick={() => setSelectedId(option.id)}
                variant={option.id === selectedId ? 'secondary' : 'ghost'}
              >
                <span>{option.name}</span>
                <span className="font-mono text-xs">{option.values.length}</span>
              </Button>
            ))}
          </div>
        </div>
        <div className="border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
                Values
              </p>
              <h2 className="mt-1 font-semibold text-lg">{selectedOption.name}</h2>
            </div>
            <StatusPill>Active</StatusPill>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {selectedOption.values.map((value) => (
              <StatusPill key={value}>{value}</StatusPill>
            ))}
          </div>
          <div className="mt-7 border-border border-t pt-5">
            <Label htmlFor="quick-option-value">Quick add value</Label>
            <div className="mt-2 flex gap-2">
              <Input
                id="quick-option-value"
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Add a ${selectedOption.name.toLowerCase()} value`}
                value={draft}
              />
              <Button disabled={!draft.trim()} onClick={addValue}>
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
