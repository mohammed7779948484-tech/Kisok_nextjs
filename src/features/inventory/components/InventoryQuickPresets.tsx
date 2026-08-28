'use client';

import { KisokButton } from '@/shared/ui';

export interface InventoryQuickPresetsProps {
  disabled?: boolean;
  onSelect: (amount: number) => void;
}

const PRESETS = [5, 10, 25, 50, 100];

export function InventoryQuickPresets({ disabled = false, onSelect }: InventoryQuickPresetsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      <span className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.14em]">
        Quick add:
      </span>
      {PRESETS.map((preset) => (
        <KisokButton
          className="h-5 px-2 font-mono text-[10px]"
          disabled={disabled}
          key={preset}
          onClick={() => onSelect(preset)}
          size="xs"
          type="button"
          variant="outline"
        >
          +{preset}
        </KisokButton>
      ))}
    </div>
  );
}
