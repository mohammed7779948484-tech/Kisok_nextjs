'use client';

import { useEffect, useState } from 'react';

import { useUpdate } from '@refinedev/core';

import { Label } from '@/components/ui/label';
import { KisokButton, KisokInput } from '@/shared/ui';

import { useOptionTypeReorder } from '../hooks/useOptionTypeReorder';
import { OPTION_TYPES_PAGE_SIZE, useOptionTypesList } from '../hooks/useOptionTypesList';
import { useOptionValueDeletion } from '../hooks/useOptionValueDeletion';
import { useOptionValueReorder } from '../hooks/useOptionValueReorder';
import { useOptionValuesForType } from '../hooks/useOptionValuesForType';
import type { OptionValueRecord } from '../types';
import { ConfirmActionDialog } from './ConfirmActionDialog';
import { type OptionTypeDialogState, OptionTypeFormDialog } from './OptionTypeFormDialog';
import { OptionTypesNav } from './OptionTypesNav';
import { type OptionValueDialogState, OptionValueFormDialog } from './OptionValueFormDialog';
import { OptionValuesWorkspace } from './OptionValuesWorkspace';

/** Debounced-as-you-type search — same pattern as `BrandsPanel`. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function OptionLibraryPanel() {
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const {
    optionTypes,
    total,
    isLoading,
    isError,
    refetch: refetchOptionTypes,
  } = useOptionTypesList({ page, search: debouncedSearch });
  const [selectedId, setSelectedId] = useState('');
  const selectedOptionTypeId = selectedId || optionTypes[0]?.id || '';
  const selectedOptionType = optionTypes.find((option) => option.id === selectedOptionTypeId);

  const {
    optionValues,
    isLoading: valuesLoading,
    isError: valuesError,
    refetch: refetchValues,
  } = useOptionValuesForType(selectedOptionTypeId || undefined);

  const { mutate: updateOptionType } = useUpdate();
  const { mutate: updateOptionValue } = useUpdate();
  const { move: moveOptionType, isReordering: isReorderingOptionType } = useOptionTypeReorder(
    () => void refetchOptionTypes(),
  );
  const { move: moveOptionValue, isReordering: isReorderingOptionValue } = useOptionValueReorder(
    selectedOptionTypeId,
    optionValues,
    () => void refetchValues(),
  );
  const optionValueDeletion = useOptionValueDeletion({
    onCompleted: () => void refetchValues(),
  });

  const [typeDialogState, setTypeDialogState] = useState<OptionTypeDialogState>({
    mode: 'create',
    open: false,
  });
  const [valueDialogState, setValueDialogState] = useState<OptionValueDialogState>({
    mode: 'create',
    open: false,
  });
  const [deactivateOptionType, setDeactivateOptionType] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deactivateOptionValue, setDeactivateOptionValue] = useState<OptionValueRecord | null>(
    null,
  );

  const totalPages = Math.max(1, Math.ceil(total / OPTION_TYPES_PAGE_SIZE));

  function toggleOptionTypeActive(optionType: { id: string; isActive: boolean; name?: string }) {
    if (optionType.isActive) {
      setDeactivateOptionType({ id: optionType.id, name: optionType.name ?? 'this Option Type' });
      return;
    }
    updateOptionType({
      id: optionType.id,
      resource: 'option_types',
      values: { is_active: true },
    });
  }

  function confirmDeactivateOptionType() {
    if (!deactivateOptionType) return;
    updateOptionType({
      id: deactivateOptionType.id,
      resource: 'option_types',
      values: { is_active: false },
    });
    setDeactivateOptionType(null);
  }

  function toggleOptionValueActive(optionValue: OptionValueRecord) {
    if (optionValue.isActive) {
      setDeactivateOptionValue(optionValue);
      return;
    }
    updateOptionValue({
      id: optionValue.id,
      resource: 'option_values',
      values: { is_active: true },
    });
  }

  function confirmDeactivateOptionValue() {
    if (!deactivateOptionValue) return;
    updateOptionValue({
      id: deactivateOptionValue.id,
      resource: 'option_values',
      values: { is_active: false },
    });
    setDeactivateOptionValue(null);
  }

  return (
    <section className="rounded-2xl border border-border bg-card/90 p-4 text-card-foreground shadow-panel sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.2em]">
            Catalog masters / hosted data
          </p>
          <h1 className="mt-2 text-balance font-black text-4xl tracking-[-0.05em] sm:text-5xl">
            Option library
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground text-sm leading-6">
            Maintain reusable Option Types and their Values for product variants.
          </p>
        </div>
        <div className="flex gap-2">
          <KisokButton
            onClick={() => setTypeDialogState({ mode: 'create', open: true })}
            variant="default"
          >
            Add Option Type
          </KisokButton>
          <KisokButton onClick={() => void refetchOptionTypes()} variant="outline">
            Refresh
          </KisokButton>
        </div>
      </div>

      <div className="mt-6 max-w-lg">
        <Label className="sr-only" htmlFor="option-type-search">
          Search Option Types
        </Label>
        <KisokInput
          id="option-type-search"
          onChange={(event) => {
            setSearchInput(event.target.value);
            setPage(1);
          }}
          placeholder="Search Option Types"
          value={searchInput}
        />
      </div>

      {isLoading ? (
        <p className="mt-6 text-muted-foreground text-sm" role="status">
          Loading option library…
        </p>
      ) : isError ? (
        <div className="mt-6 grid gap-3" role="alert">
          <p className="text-destructive text-sm">
            Option library could not be loaded. Check the connection and try again.
          </p>
          <KisokButton onClick={() => void refetchOptionTypes()} variant="outline">
            Try again
          </KisokButton>
        </div>
      ) : optionTypes.length === 0 ? (
        <p className="mt-6 text-muted-foreground text-sm">No Option Types match this search.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <OptionTypesNav
            isReordering={isReorderingOptionType}
            onMoveType={moveOptionType}
            onOpenCreate={() => setTypeDialogState({ mode: 'create', open: true })}
            onOpenEdit={(optionType) =>
              setTypeDialogState({ mode: 'edit', open: true, optionType })
            }
            onPageChange={setPage}
            onSelectType={setSelectedId}
            onToggleActive={toggleOptionTypeActive}
            optionTypes={optionTypes}
            page={page}
            selectedOptionTypeId={selectedOptionTypeId}
            total={total}
            totalPages={totalPages}
          />

          {selectedOptionType ? (
            <OptionValuesWorkspace
              isError={valuesError}
              isLoading={valuesLoading}
              isReordering={isReorderingOptionValue}
              onDeleteValue={optionValueDeletion.begin}
              onMoveValue={moveOptionValue}
              onOpenCreateValue={() => setValueDialogState({ mode: 'create', open: true })}
              onOpenEditValue={(value) =>
                setValueDialogState({ mode: 'edit', open: true, optionValue: value })
              }
              onRetry={() => void refetchValues()}
              onToggleActiveValue={toggleOptionValueActive}
              optionValues={optionValues}
              selectedOptionType={selectedOptionType}
            />
          ) : null}
        </div>
      )}

      <OptionTypeFormDialog
        dialogState={typeDialogState}
        onOpenChange={(open) => setTypeDialogState((current) => ({ ...current, open }))}
      />
      {selectedOptionTypeId ? (
        <OptionValueFormDialog
          dialogState={valueDialogState}
          onOpenChange={(open) => setValueDialogState((current) => ({ ...current, open }))}
          optionTypeId={selectedOptionTypeId}
        />
      ) : null}

      <ConfirmActionDialog
        confirmLabel="Deactivate"
        description={`Deactivating ${deactivateOptionType?.name ?? 'this Option Type'} may hide Products/Variants that depend on it from customers. Continue?`}
        onCancel={() => setDeactivateOptionType(null)}
        onConfirm={confirmDeactivateOptionType}
        open={deactivateOptionType !== null}
        title={`Deactivate ${deactivateOptionType?.name ?? 'Option Type'}`}
      />

      <ConfirmActionDialog
        confirmLabel="Deactivate"
        description={`Deactivating ${deactivateOptionValue?.value ?? 'this Option Value'} may hide Products/Variants that depend on it from customers. Continue?`}
        onCancel={() => setDeactivateOptionValue(null)}
        onConfirm={confirmDeactivateOptionValue}
        open={deactivateOptionValue !== null}
        title={`Deactivate ${deactivateOptionValue?.value ?? 'Option Value'}`}
      />

      <ConfirmActionDialog
        confirmLabel={optionValueDeletion.inUseBlocked ? 'Close' : 'Delete'}
        description={
          optionValueDeletion.inUseBlocked
            ? (optionValueDeletion.error ?? '')
            : `Delete ${optionValueDeletion.optionValue?.value ?? 'this Option Value'}? This cannot be undone.`
        }
        destructive={!optionValueDeletion.inUseBlocked}
        isWorking={optionValueDeletion.isWorking}
        onCancel={optionValueDeletion.cancel}
        onConfirm={
          optionValueDeletion.inUseBlocked
            ? optionValueDeletion.cancel
            : () => void optionValueDeletion.confirm()
        }
        open={optionValueDeletion.optionValue !== null}
        title={
          optionValueDeletion.inUseBlocked
            ? `Cannot delete ${optionValueDeletion.optionValue?.value ?? 'Option Value'}`
            : `Delete ${optionValueDeletion.optionValue?.value ?? 'Option Value'}?`
        }
      />
    </section>
  );
}
