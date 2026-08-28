'use client';

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { KisokButton, StatusPill } from '@/shared/ui';

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
                  className={isSelected ? 'bg-muted/70 font-medium' : undefined}
                  key={optionType.id}
                >
                  <TableCell className="font-medium whitespace-nowrap">
                    <button
                      className="text-left font-medium hover:underline cursor-pointer"
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
        <Pagination className="mt-4 justify-start">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-disabled={page <= 1}
                onClick={() => onPageChange(Math.max(1, page - 1))}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <PaginationItem key={pageNumber}>
                <PaginationLink
                  isActive={pageNumber === page}
                  onClick={() => onPageChange(pageNumber)}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                aria-disabled={page >= totalPages}
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
