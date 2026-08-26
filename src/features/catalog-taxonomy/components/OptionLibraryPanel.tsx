'use client';

import { useEffect, useState } from 'react';

import { useUpdate } from '@refinedev/core';
import { Controller } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  KisokButton,
  KisokDialog,
  KisokDialogContent,
  KisokDialogDescription,
  KisokDialogFooter,
  KisokDialogHeader,
  KisokDialogTitle,
  KisokInput,
  StatusPill,
} from '@/shared/ui';

import { useOptionTypeForm } from '../hooks/useOptionTypeForm';
import { useOptionTypeReorder } from '../hooks/useOptionTypeReorder';
import { OPTION_TYPES_PAGE_SIZE, useOptionTypesList } from '../hooks/useOptionTypesList';
import { useOptionValueForm } from '../hooks/useOptionValueForm';
import { useOptionValueReorder } from '../hooks/useOptionValueReorder';
import { useOptionValuesForType } from '../hooks/useOptionValuesForType';
import {
  type OptionTypeFormValues,
  optionTypeFormDefaultValues,
} from '../schemas/option-type.schema';
import {
  type OptionValueFormValues,
  optionValueFormDefaultValues,
} from '../schemas/option-value.schema';
import type { OptionValueRecord } from '../types';

/** Debounced-as-you-type search — same pattern as `BrandsPanel`. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

type OptionTypeDialogState = {
  open: boolean;
  mode: 'create' | 'edit';
  optionType?: { id: string; name: string; isActive: boolean };
};

function OptionTypeFormDialog({
  dialogState,
  onOpenChange,
}: {
  dialogState: OptionTypeDialogState;
  onOpenChange: (open: boolean) => void;
}) {
  const { mode, optionType, open } = dialogState;
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    refineCore: { onFinish },
  } = useOptionTypeForm({ id: optionType?.id, mode });

  useEffect(() => {
    if (!open) return;
    reset(
      optionType
        ? { name: optionType.name, is_active: optionType.isActive }
        : optionTypeFormDefaultValues,
    );
  }, [open, optionType, reset]);

  async function onSubmit(values: OptionTypeFormValues) {
    await onFinish(values);
    onOpenChange(false);
  }

  return (
    <KisokDialog onOpenChange={onOpenChange} open={open}>
      <KisokDialogContent>
        <KisokDialogHeader>
          <KisokDialogTitle>
            {mode === 'create' ? 'Add Option Type' : 'Edit Option Type'}
          </KisokDialogTitle>
          <KisokDialogDescription>
            {mode === 'create'
              ? 'Create a reusable hosted Option Type.'
              : 'Update this Option Type. Values already using it keep their reference.'}
          </KisokDialogDescription>
        </KisokDialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <Label htmlFor="option-type-name">Option Type name</Label>
            <KisokInput
              aria-invalid={Boolean(errors.name)}
              id="option-type-name"
              {...register('name')}
            />
            {errors.name ? <p className="text-destructive text-sm">{errors.name.message}</p> : null}
          </div>
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={field.value}
                  id="option-type-active"
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
                <Label htmlFor="option-type-active">Active</Label>
              </div>
            )}
          />
          <KisokDialogFooter>
            <KisokButton
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="quiet"
            >
              Cancel
            </KisokButton>
            <KisokButton disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Saving…' : 'Save Option Type'}
            </KisokButton>
          </KisokDialogFooter>
        </form>
      </KisokDialogContent>
    </KisokDialog>
  );
}

type OptionValueDialogState = {
  open: boolean;
  mode: 'create' | 'edit';
  optionValue?: OptionValueRecord;
};

function OptionValueFormDialog({
  dialogState,
  onOpenChange,
  optionTypeId,
}: {
  dialogState: OptionValueDialogState;
  onOpenChange: (open: boolean) => void;
  optionTypeId: string;
}) {
  const { mode, optionValue, open } = dialogState;
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    refineCore: { onFinish },
  } = useOptionValueForm({ id: optionValue?.id, mode, optionTypeId });

  useEffect(() => {
    if (!open) return;
    reset(
      optionValue
        ? {
            option_type_id: optionTypeId,
            value: optionValue.value,
            is_active: optionValue.isActive,
          }
        : optionValueFormDefaultValues(optionTypeId),
    );
  }, [open, optionValue, optionTypeId, reset]);

  async function onSubmit(values: OptionValueFormValues) {
    await onFinish(values);
    onOpenChange(false);
  }

  return (
    <KisokDialog onOpenChange={onOpenChange} open={open}>
      <KisokDialogContent>
        <KisokDialogHeader>
          <KisokDialogTitle>
            {mode === 'create' ? 'Add Option Value' : 'Edit Option Value'}
          </KisokDialogTitle>
          <KisokDialogDescription>
            {mode === 'create'
              ? 'Add a Value scoped to the selected Option Type.'
              : 'Update this Value. Variants already using it keep their reference.'}
          </KisokDialogDescription>
        </KisokDialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <Label htmlFor="option-value">Option Value</Label>
            <KisokInput
              aria-invalid={Boolean(errors.value)}
              id="option-value"
              {...register('value')}
            />
            {errors.value ? (
              <p className="text-destructive text-sm">{errors.value.message}</p>
            ) : null}
          </div>
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={field.value}
                  id="option-value-active"
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
                <Label htmlFor="option-value-active">Active</Label>
              </div>
            )}
          />
          <KisokDialogFooter>
            <KisokButton
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="quiet"
            >
              Cancel
            </KisokButton>
            <KisokButton disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Saving…' : 'Save Option Value'}
            </KisokButton>
          </KisokDialogFooter>
        </form>
      </KisokDialogContent>
    </KisokDialog>
  );
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
    refetch: refetchValues,
  } = useOptionValuesForType(selectedOptionTypeId || undefined);

  const { mutate: updateOptionType } = useUpdate();
  const { mutate: updateOptionValue } = useUpdate();
  const { move: moveOptionType } = useOptionTypeReorder(() => void refetchOptionTypes());
  const { move: moveOptionValue } = useOptionValueReorder(
    selectedOptionTypeId,
    optionValues,
    () => void refetchValues(),
  );

  const [typeDialogState, setTypeDialogState] = useState<OptionTypeDialogState>({
    mode: 'create',
    open: false,
  });
  const [valueDialogState, setValueDialogState] = useState<OptionValueDialogState>({
    mode: 'create',
    open: false,
  });

  const totalPages = Math.max(1, Math.ceil(total / OPTION_TYPES_PAGE_SIZE));

  function toggleOptionTypeActive(optionType: { id: string; isActive: boolean }) {
    updateOptionType({
      id: optionType.id,
      resource: 'option_types',
      values: { is_active: !optionType.isActive },
    });
  }

  function toggleOptionValueActive(optionValue: OptionValueRecord) {
    updateOptionValue({
      id: optionValue.id,
      resource: 'option_values',
      values: { is_active: !optionValue.isActive },
    });
  }

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
        <div className="flex gap-2">
          <KisokButton
            onClick={() => setTypeDialogState({ mode: 'create', open: true })}
            variant="outline"
          >
            Add Option Type
          </KisokButton>
          <KisokButton onClick={() => void refetchOptionTypes()} variant="outline">
            Refresh
          </KisokButton>
        </div>
      </div>

      <div>
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
        <p className="text-muted-foreground text-sm" role="status">
          Loading option library…
        </p>
      ) : isError ? (
        <div className="grid gap-3" role="alert">
          <p className="text-destructive text-sm">
            Option library could not be loaded. Check the connection and try again.
          </p>
          <KisokButton onClick={() => void refetchOptionTypes()} variant="outline">
            Try again
          </KisokButton>
        </div>
      ) : optionTypes.length === 0 ? (
        <p className="text-muted-foreground text-sm">No Option Types match this search.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="border border-border bg-card p-5">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
              Option Types
            </p>
            <div className="mt-4 space-y-2">
              {optionTypes.map((optionType) => (
                <div
                  className={`flex items-center justify-between gap-2 border px-3 py-2 text-sm ${optionType.id === selectedOptionTypeId ? 'border-foreground bg-muted' : 'border-border bg-transparent'}`}
                  key={optionType.id}
                >
                  <button
                    className="flex flex-1 items-center justify-between gap-2 text-left"
                    onClick={() => setSelectedId(optionType.id)}
                    type="button"
                  >
                    <span>{optionType.name}</span>
                    <StatusPill
                      className={
                        optionType.isActive ? undefined : 'border-destructive text-destructive'
                      }
                    >
                      {optionType.isActive ? 'Active' : 'Inactive'}
                    </StatusPill>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <KisokButton
                      aria-label={`Move ${optionType.name} up`}
                      onClick={() => void moveOptionType(optionType, 'up')}
                      size="sm"
                      variant="quiet"
                    >
                      ▲
                    </KisokButton>
                    <KisokButton
                      aria-label={`Move ${optionType.name} down`}
                      onClick={() => void moveOptionType(optionType, 'down')}
                      size="sm"
                      variant="quiet"
                    >
                      ▼
                    </KisokButton>
                    <KisokButton
                      onClick={() => setTypeDialogState({ mode: 'edit', open: true, optionType })}
                      size="sm"
                      variant="quiet"
                    >
                      Edit
                    </KisokButton>
                    <KisokButton
                      aria-label={`${optionType.isActive ? 'Deactivate' : 'Activate'} ${optionType.name}`}
                      onClick={() => toggleOptionTypeActive(optionType)}
                      size="sm"
                      variant="quiet"
                    >
                      {optionType.isActive ? 'Deactivate' : 'Activate'}
                    </KisokButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {selectedOptionType ? (
            <div className="border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
                    Values
                  </p>
                  <h2 className="mt-1 font-semibold text-lg">{selectedOptionType.name}</h2>
                </div>
                <KisokButton
                  onClick={() => setValueDialogState({ mode: 'create', open: true })}
                  size="sm"
                  variant="outline"
                >
                  Add Value
                </KisokButton>
              </div>
              {valuesLoading ? (
                <p className="mt-5 text-muted-foreground text-sm" role="status">
                  Loading Values…
                </p>
              ) : optionValues.length === 0 ? (
                <p className="mt-5 text-muted-foreground text-sm">
                  No Values yet for this Option Type.
                </p>
              ) : (
                <div className="mt-5 flex flex-wrap gap-2">
                  {optionValues.map((value) => (
                    <div className="flex items-center gap-1" key={value.id}>
                      <StatusPill
                        className={
                          value.isActive ? undefined : 'border-destructive text-destructive'
                        }
                      >
                        {value.value}
                      </StatusPill>
                      <KisokButton
                        aria-label={`Move ${value.value} up`}
                        onClick={() => void moveOptionValue(value, 'up')}
                        size="sm"
                        variant="quiet"
                      >
                        ▲
                      </KisokButton>
                      <KisokButton
                        aria-label={`Move ${value.value} down`}
                        onClick={() => void moveOptionValue(value, 'down')}
                        size="sm"
                        variant="quiet"
                      >
                        ▼
                      </KisokButton>
                      <KisokButton
                        onClick={() =>
                          setValueDialogState({ mode: 'edit', open: true, optionValue: value })
                        }
                        size="sm"
                        variant="quiet"
                      >
                        Edit
                      </KisokButton>
                      <KisokButton
                        aria-label={`${value.isActive ? 'Deactivate' : 'Activate'} ${value.value}`}
                        onClick={() => toggleOptionValueActive(value)}
                        size="sm"
                        variant="quiet"
                      >
                        {value.isActive ? 'Deactivate' : 'Activate'}
                      </KisokButton>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <KisokButton
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            size="sm"
            variant="quiet"
          >
            Previous
          </KisokButton>
          <span>
            Page {page} of {totalPages}
          </span>
          <KisokButton
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            size="sm"
            variant="quiet"
          >
            Next
          </KisokButton>
        </div>
      ) : null}

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
    </section>
  );
}
