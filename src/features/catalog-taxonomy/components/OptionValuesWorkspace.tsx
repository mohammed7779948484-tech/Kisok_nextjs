'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { KisokButton, StatusPill } from '@/shared/ui';

import type { OptionValueRecord } from '../types';

export interface SelectedOptionType {
  id: string;
  name: string;
  isActive: boolean;
}

export interface OptionValuesWorkspaceProps {
  selectedOptionType: SelectedOptionType;
  optionValues: OptionValueRecord[];
  isLoading: boolean;
  onOpenCreateValue: () => void;
  onOpenEditValue: (value: OptionValueRecord) => void;
  onToggleActiveValue: (value: OptionValueRecord) => void;
  onMoveValue: (value: OptionValueRecord, direction: 'up' | 'down') => void;
}

export function OptionValuesWorkspace({
  selectedOptionType,
  optionValues,
  isLoading,
  onOpenCreateValue,
  onOpenEditValue,
  onToggleActiveValue,
  onMoveValue,
}: OptionValuesWorkspaceProps) {
  return (
    <div className="border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4 border-border border-b pb-4">
        <div>
          <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
            Values
          </p>
          <h2 className="mt-1 font-semibold text-lg">{selectedOptionType.name}</h2>
        </div>
        <KisokButton onClick={onOpenCreateValue} size="sm" variant="outline">
          Add Value
        </KisokButton>
      </div>

      {isLoading ? (
        <p className="mt-6 text-muted-foreground text-sm" role="status">
          Loading Values…
        </p>
      ) : optionValues.length === 0 ? (
        <p className="mt-6 text-muted-foreground text-sm">No Values yet for this Option Type.</p>
      ) : (
        <Table className="mt-6">
          <TableHeader>
            <TableRow>
              <TableHead>Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Order</TableHead>
              <TableHead className="text-right">Reorder</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {optionValues.map((value, idx) => (
              <TableRow key={value.id}>
                <TableCell className="font-medium">{value.value}</TableCell>
                <TableCell>
                  <StatusPill
                    className={value.isActive ? undefined : 'border-destructive text-destructive'}
                  >
                    {value.isActive ? 'Active' : 'Inactive'}
                  </StatusPill>
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground text-xs">
                  {value.displayOrder ?? idx + 1}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <KisokButton
                      aria-label={`Move ${value.value} up`}
                      onClick={() => void onMoveValue(value, 'up')}
                      size="sm"
                      variant="quiet"
                    >
                      ▲
                    </KisokButton>
                    <KisokButton
                      aria-label={`Move ${value.value} down`}
                      onClick={() => void onMoveValue(value, 'down')}
                      size="sm"
                      variant="quiet"
                    >
                      ▼
                    </KisokButton>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <KisokButton onClick={() => onOpenEditValue(value)} size="sm" variant="quiet">
                      Edit
                    </KisokButton>
                    <KisokButton
                      aria-label={`${value.isActive ? 'Deactivate' : 'Activate'} ${value.value}`}
                      onClick={() => onToggleActiveValue(value)}
                      size="sm"
                      variant="quiet"
                    >
                      {value.isActive ? 'Deactivate' : 'Activate'}
                    </KisokButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
