'use client';

import { useEffect } from 'react';

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
} from '@/shared/ui';

import { useOptionValueForm } from '../hooks/useOptionValueForm';
import {
  type OptionValueFormValues,
  optionValueFormDefaultValues,
} from '../schemas/option-value.schema';
import type { OptionValueRecord } from '../types';

export type OptionValueDialogState = {
  open: boolean;
  mode: 'create' | 'edit';
  optionValue?: OptionValueRecord;
};

export interface OptionValueFormDialogProps {
  dialogState: OptionValueDialogState;
  onOpenChange: (open: boolean) => void;
  optionTypeId: string;
}

export function OptionValueFormDialog({
  dialogState,
  onOpenChange,
  optionTypeId,
}: OptionValueFormDialogProps) {
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
              placeholder="e.g. Small, Medium, Large"
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
