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

import { useOptionTypeForm } from '../hooks/useOptionTypeForm';
import {
  type OptionTypeFormValues,
  optionTypeFormDefaultValues,
} from '../schemas/option-type.schema';

export type OptionTypeDialogState = {
  open: boolean;
  mode: 'create' | 'edit';
  optionType?: { id: string; name: string; isActive: boolean };
};

export interface OptionTypeFormDialogProps {
  dialogState: OptionTypeDialogState;
  onOpenChange: (open: boolean) => void;
}

export function OptionTypeFormDialog({ dialogState, onOpenChange }: OptionTypeFormDialogProps) {
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
              ? 'Create a reusable Option Type (e.g. Size, Color, Roast) for product variants.'
              : 'Update this Option Type. Values already using it keep their reference.'}
          </KisokDialogDescription>
        </KisokDialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <Label htmlFor="option-type-name">Option Type name</Label>
            <KisokInput
              aria-invalid={Boolean(errors.name)}
              id="option-type-name"
              placeholder="e.g. Size, Roast Level, Color"
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
