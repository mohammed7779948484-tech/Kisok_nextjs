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
    <div className="border border-border bg-card p-5">
      <div className="flex items-center justify-between border-border border-b pb-4">
        <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
          Option Types ({total})
        </p>
        <KisokButton onClick={onOpenCreate} size="sm" variant="quiet">
          + Add Type
        </KisokButton>
      </div>

      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Reorder</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {optionTypes.map((optionType) => {
            const isSelected = optionType.id === selectedOptionTypeId;
            return (
              <TableRow
                className={isSelected ? 'bg-muted/70 font-medium' : undefined}
                key={optionType.id}
              >
                <TableCell>
                  <button
                    className="w-full text-left font-medium hover:underline cursor-pointer"
                    onClick={() => onSelectType(optionType.id)}
                    type="button"
                  >
                    {optionType.name}
                  </button>
                </TableCell>
                <TableCell>
                  <StatusPill
                    className={
                      optionType.isActive ? undefined : 'border-destructive text-destructive'
                    }
                  >
                    {optionType.isActive ? 'Active' : 'Inactive'}
                  </StatusPill>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <KisokButton
                      aria-label={`Move ${optionType.name} up`}
                      disabled={isReordering}
                      onClick={() => onMoveType(optionType, 'up')}
                      size="sm"
                      variant="quiet"
                    >
                      ▲
                    </KisokButton>
                    <KisokButton
                      aria-label={`Move ${optionType.name} down`}
                      disabled={isReordering}
                      onClick={() => onMoveType(optionType, 'down')}
                      size="sm"
                      variant="quiet"
                    >
                      ▼
                    </KisokButton>
                  </div>
                </TableCell>
                <TableCell className="text-right">
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
