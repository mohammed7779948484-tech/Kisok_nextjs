'use client';

import { useContext, useEffect, useId, useMemo, useRef, useState } from 'react';

import { QueryClientContext } from '@tanstack/react-query';
import { CheckIcon, ChevronDownIcon, Loader2Icon, PlusIcon } from 'lucide-react';

import { catalogTaxonomyRepository } from '@/features/catalog-taxonomy/repositories';
import type { OptionTypeRecord, OptionValueRecord } from '@/features/catalog-taxonomy/types';
import { cn } from '@/lib/utils';
import { KisokButton } from '@/shared/ui';

export interface CreatableOptionValueComboboxProps {
  className?: string;
  disabled?: boolean;
  id?: string;
  onCreated?: (record: OptionValueRecord) => void;
  onValueChange: (valueId: string | null) => void;
  optionType?: OptionTypeRecord | null;
  placeholder?: string;
  value: string | null;
}

export function CreatableOptionValueCombobox({
  className,
  disabled = false,
  id = 'variant-option-value',
  onCreated,
  onValueChange,
  optionType,
  placeholder = 'Choose or type a value…',
  value,
}: CreatableOptionValueComboboxProps) {
  const queryClient = useContext(QueryClientContext);
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  const activeValues = useMemo(() => {
    return (optionType?.values ?? []).filter((item) => item.isActive);
  }, [optionType]);

  const selectedValueRecord = useMemo(() => {
    return activeValues.find((item) => item.id === value) ?? null;
  }, [activeValues, value]);

  // Keep input text synced with selected value when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedValueRecord?.value ?? '');
    }
  }, [selectedValueRecord, isOpen]);

  const normalizedQuery = query.trim().toLowerCase();

  const exactMatch = useMemo(() => {
    if (!normalizedQuery) return null;
    return activeValues.find((item) => item.value.trim().toLowerCase() === normalizedQuery);
  }, [activeValues, normalizedQuery]);

  const filteredValues = useMemo(() => {
    if (!normalizedQuery) return activeValues;
    return activeValues.filter((item) => item.value.trim().toLowerCase().includes(normalizedQuery));
  }, [activeValues, normalizedQuery]);

  const showCreateOption = Boolean(normalizedQuery && !exactMatch && optionType?.id && !isCreating);

  // Total navigable items: filtered items + (create button if visible)
  const totalNavigableItems = filteredValues.length + (showCreateOption ? 1 : 0);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleCreate(textToCreate: string) {
    if (!optionType?.id || isCreating) return;
    const cleanValue = textToCreate.trim();
    if (!cleanValue) return;

    setIsCreating(true);
    setCreationError(null);

    try {
      const createdRecord = await catalogTaxonomyRepository.createOptionValue({
        optionTypeId: optionType.id,
        value: cleanValue,
      });

      onValueChange(createdRecord.id);
      onCreated?.(createdRecord);
      if (queryClient) {
        void queryClient.invalidateQueries({
          queryKey: ['product-editor', 'references'],
        });
      }
      setIsOpen(false);
      setQuery(createdRecord.value);
    } catch (caughtError) {
      const msg = caughtError instanceof Error ? caughtError.message : 'Unknown error';
      setCreationError(`Could not create "${cleanValue}": ${msg}`);
    } finally {
      setIsCreating(false);
    }
  }

  function handleSelect(record: OptionValueRecord) {
    onValueChange(record.id);
    setIsOpen(false);
    setQuery(record.value);
    setCreationError(null);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled || !optionType) return;

    if (event.key === 'Escape') {
      if (isOpen) {
        event.preventDefault();
        event.stopPropagation();
        setIsOpen(false);
        setQuery(selectedValueRecord?.value ?? '');
      }
      return;
    }

    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, totalNavigableItems));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex(
        (prev) => (prev - 1 + totalNavigableItems) % Math.max(1, totalNavigableItems),
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (highlightedIndex < filteredValues.length) {
        const item = filteredValues[highlightedIndex];
        if (item) handleSelect(item);
      } else if (showCreateOption) {
        void handleCreate(query);
      }
    } else if (event.key === 'Tab') {
      setIsOpen(false);
    }
  }

  return (
    <div className={cn('relative w-full', className)} ref={containerRef}>
      <div className="relative flex items-center">
        <input
          aria-autocomplete="list"
          aria-controls={isOpen ? listboxId : undefined}
          aria-expanded={isOpen}
          aria-label="Option Value"
          aria-haspopup="listbox"
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-base shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          )}
          disabled={disabled || !optionType}
          id={id}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlightedIndex(0);
            if (!isOpen) setIsOpen(true);
          }}
          onClick={() => {
            if (!disabled && optionType) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled && optionType) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={optionType ? placeholder : 'Select an Option Type first'}
          ref={inputRef}
          role="combobox"
          value={query}
        />
        <button
          aria-label="Toggle value options dropdown"
          className="absolute right-2 text-muted-foreground hover:text-foreground cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || !optionType}
          onClick={() => {
            if (!disabled && optionType) {
              setIsOpen((prev) => !prev);
              inputRef.current?.focus();
            }
          }}
          tabIndex={-1}
          type="button"
        >
          <ChevronDownIcon className="size-4" />
        </button>
      </div>

      {isOpen && optionType ? (
        <div
          aria-label="Option values"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
          id={listboxId}
          role="listbox"
        >
          {filteredValues.length === 0 && !showCreateOption && !creationError ? (
            <p className="py-2 text-center text-muted-foreground text-sm">
              No matching values found.
            </p>
          ) : null}

          {filteredValues.map((item, index) => {
            const isSelected = item.id === value;
            const isHighlighted = index === highlightedIndex;

            return (
              <button
                aria-selected={isSelected}
                className={cn(
                  'relative flex w-full cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm select-none outline-hidden transition-colors',
                  isHighlighted
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'hover:bg-muted/50',
                  isSelected && 'font-bold text-primary',
                )}
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setHighlightedIndex(index)}
                role="option"
                tabIndex={-1}
                type="button"
              >
                <span>{item.value}</span>
                {isSelected ? <CheckIcon className="size-4 text-primary" /> : null}
              </button>
            );
          })}

          {showCreateOption ? (
            <button
              className={cn(
                'flex w-full cursor-pointer items-center gap-2 rounded-sm border-t border-border/50 px-2 py-2 text-left text-primary text-sm font-semibold hover:bg-accent/40',
                highlightedIndex === filteredValues.length && 'bg-accent text-accent-foreground',
              )}
              disabled={isCreating}
              onClick={() => void handleCreate(query)}
              onMouseEnter={() => setHighlightedIndex(filteredValues.length)}
              type="button"
            >
              {isCreating ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  <span>Creating "{query.trim()}"…</span>
                </>
              ) : (
                <>
                  <PlusIcon className="size-4" />
                  <span>+ Create "{query.trim()}"</span>
                </>
              )}
            </button>
          ) : null}

          {creationError ? (
            <div
              className="mt-1 flex items-center justify-between gap-2 rounded-sm border border-destructive/30 bg-destructive/10 p-2 text-destructive text-xs"
              role="alert"
            >
              <span>{creationError}</span>
              <KisokButton
                className="h-6 px-2 text-xs"
                disabled={isCreating}
                onClick={() => void handleCreate(query)}
                size="xs"
                type="button"
                variant="outline"
              >
                Retry
              </KisokButton>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
