'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CompactPagination, KisokButton, StatusPill } from '@/shared/ui';

import { ReorderButtonGroup } from './ReorderButtonGroup';

export interface OptionTypeItem {
  id: string;
  name: string;
  isActive: boolean;
  displayOrder: number;
}

export interface OptionTypesNavProps {
  optionTypes: OptionTypeItem[];
  total: number;
  selectedOptionTypeId: string;
  onSelectType: (id: string) => void;
  onOpenCreate: () => void;
  onOpenEdit: (optionType: { id: string; name: string; isActive: boolean }) => void;
  onToggleActive: (optionType: { id: string; isActive: boolean }) => void;
  onMoveType: (optionType: { id: string }, direction: 'up' | 'down') => void;
  isReordering?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function OptionTypesNav({
  optionTypes,
  total,
  selectedOptionTypeId,
  onSelectType,
  onOpenCreate,
  onOpenEdit,
  onToggleActive,
  onMoveType,
  isReordering = false,
  page,
  totalPages,
  onPageChange,
}: OptionTypesNavProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between border-border border-b pb-4">
        <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
          Option Types ({total})
        </p>
        <KisokButton onClick={onOpenCreate} size="sm" variant="quiet">
          + Add Type
        </KisokButton>
      </div>

      <div className="w-full overflow-x-auto">
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Type</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="text-right whitespace-nowrap">Reorder</TableHead>
              <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {optionTypes.map((optionType, idx) => {
              const isSelected = optionType.id === selectedOptionTypeId;
              return (
                <TableRow
                  className={
                    isSelected
                      ? 'border-l-4 border-l-primary bg-primary/10 font-medium'
                      : 'border-l-4 border-l-transparent'
                  }
                  key={optionType.id}
                >
                  <TableCell className="font-medium whitespace-nowrap">
                    <button
                      className="cursor-pointer text-left font-medium hover:underline"
                      onClick={() => onSelectType(optionType.id)}
                      type="button"
                    >
                      {optionType.name}
                    </button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <StatusPill tone={optionType.isActive ? 'success' : 'destructive'}>
                      {optionType.isActive ? 'Active' : 'Inactive'}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <ReorderButtonGroup
                      isFirst={idx === 0}
                      isLast={idx === optionTypes.length - 1}
                      isReordering={isReordering}
                      itemName={optionType.name}
                      onMoveDown={() => onMoveType(optionType, 'down')}
                      onMoveUp={() => onMoveType(optionType, 'up')}
                    />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <KisokButton onClick={() => onOpenEdit(optionType)} size="sm" variant="quiet">
                        Edit
                      </KisokButton>
                      <KisokButton
                        aria-label={`${
                          optionType.isActive ? 'Deactivate' : 'Activate'
                        } ${optionType.name}`}
                        onClick={() => onToggleActive(optionType)}
                        size="sm"
                        variant="quiet"
                      >
                        {optionType.isActive ? 'Deactivate' : 'Activate'}
                      </KisokButton>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between border-border border-t pt-3">
          <p className="font-mono text-muted-foreground text-xs">
            Page {page} of {totalPages}
          </p>
          <CompactPagination onPageChange={onPageChange} page={page} totalPages={totalPages} />
        </div>
      ) : null}
    </div>
  );
}
