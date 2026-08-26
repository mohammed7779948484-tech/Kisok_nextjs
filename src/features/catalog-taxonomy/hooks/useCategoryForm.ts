'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { HttpError } from '@refinedev/core';
import { useForm } from '@refinedev/react-hook-form';

import type { Database } from '@/infrastructure/supabase/database.types';

import {
  type CategoryFormValues,
  categoryFormDefaultValues,
  categoryFormSchema,
} from '../schemas/category.schema';

type CategoryRow = Database['public']['Tables']['categories']['Row'];

/** Same pattern as `useBrandForm`, against the `categories` resource. */
export function useCategoryForm(params: { mode: 'create' | 'edit'; id?: string }) {
  return useForm<CategoryRow, HttpError, CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: categoryFormDefaultValues,
    refineCoreProps: {
      resource: 'categories',
      action: params.mode,
      id: params.id,
      redirect: false,
    },
  });
}
