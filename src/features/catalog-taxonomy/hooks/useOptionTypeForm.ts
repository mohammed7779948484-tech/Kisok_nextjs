'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { HttpError } from '@refinedev/core';
import { useForm } from '@refinedev/react-hook-form';

import type { Database } from '@/infrastructure/supabase/database.types';

import {
  type OptionTypeFormValues,
  optionTypeFormDefaultValues,
  optionTypeFormSchema,
} from '../schemas/option-type.schema';

type OptionTypeRow = Database['public']['Tables']['option_types']['Row'];

/** Same pattern as `useBrandForm`, against the `option_types` resource. */
export function useOptionTypeForm(params: { mode: 'create' | 'edit'; id?: string }) {
  return useForm<OptionTypeRow, HttpError, OptionTypeFormValues>({
    resolver: zodResolver(optionTypeFormSchema),
    defaultValues: optionTypeFormDefaultValues,
    refineCoreProps: {
      resource: 'option_types',
      action: params.mode,
      id: params.id,
      redirect: false,
    },
  });
}
