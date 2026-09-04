'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { HttpError } from '@refinedev/core';
import { useForm } from '@refinedev/react-hook-form';

import type { Database } from '@/infrastructure/supabase/database.types';

import {
  type OptionValueFormValues,
  optionValueFormDefaultValues,
  optionValueFormSchema,
} from '../schemas/option-value.schema';

type OptionValueRow = Database['public']['Tables']['option_values']['Row'];

/**
 * Same pattern as `useBrandForm`, against the `option_values` resource.
 * `optionTypeId` scopes the create default and is not user-editable —
 * Values always belong to the Option Type the panel has selected.
 */
export function useOptionValueForm(params: {
  mode: 'create' | 'edit';
  id?: string;
  optionTypeId: string;
}) {
  return useForm<OptionValueRow, HttpError, OptionValueFormValues>({
    resolver: zodResolver(optionValueFormSchema),
    defaultValues: optionValueFormDefaultValues(params.optionTypeId),
    refineCoreProps: {
      resource: 'option_values',
      action: params.mode,
      id: params.id,
      redirect: false,
    },
  });
}
