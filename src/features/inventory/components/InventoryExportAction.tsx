'use client';

import { KisokButton } from '@/shared/ui';

export interface InventoryExportActionProps {
  activeTab: 'stock' | 'history';
  disabled?: boolean;
  onExportHistory: () => void;
  onExportStock: () => void;
}

export function InventoryExportAction({
  activeTab,
  disabled = false,
  onExportHistory,
  onExportStock,
}: InventoryExportActionProps) {
  if (activeTab === 'history') {
    return (
      <KisokButton
        aria-label="Export history CSV"
        disabled={disabled}
        onClick={onExportHistory}
        size="sm"
        type="button"
        variant="outline"
      >
        <span className="font-mono text-xs">📥 Export History CSV</span>
      </KisokButton>
    );
  }

  return (
    <KisokButton
      aria-label="Export stock CSV"
      disabled={disabled}
      onClick={onExportStock}
      size="sm"
      type="button"
      variant="outline"
    >
      <span className="font-mono text-xs">📥 Export Stock CSV</span>
    </KisokButton>
  );
}
