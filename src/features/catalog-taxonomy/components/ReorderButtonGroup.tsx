'use client';

import { KisokButton } from '@/shared/ui';

export interface ReorderButtonGroupProps {
  hasActiveSearch?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  isReordering?: boolean;
  itemName: string;
  onMoveDown: () => void;
  onMoveUp: () => void;
}

export function ReorderButtonGroup({
  hasActiveSearch = false,
  isFirst = false,
  isLast = false,
  isReordering = false,
  itemName,
  onMoveDown,
  onMoveUp,
}: ReorderButtonGroupProps) {
  const upDisabled = isReordering || hasActiveSearch || isFirst;
  const downDisabled = isReordering || hasActiveSearch || isLast;

  return (
    <div
      className="inline-flex items-center justify-end gap-1"
      title={hasActiveSearch ? 'Clear search to reorder items' : undefined}
    >
      <KisokButton
        aria-label={`Move ${itemName} up`}
        disabled={upDisabled}
        onClick={onMoveUp}
        size="sm"
        type="button"
        variant="quiet"
      >
        ▲
      </KisokButton>
      <KisokButton
        aria-label={`Move ${itemName} down`}
        disabled={downDisabled}
        onClick={onMoveDown}
        size="sm"
        type="button"
        variant="quiet"
      >
        ▼
      </KisokButton>
    </div>
  );
}
