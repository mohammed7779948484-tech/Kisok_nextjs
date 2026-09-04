'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { HttpError } from '@refinedev/core';
import { useForm } from '@refinedev/react-hook-form';

import type { Database } from '@/infrastructure/supabase/database.types';

import {
  type BrandFormValues,
  brandFormDefaultValues,
  brandFormSchema,
} from '../schemas/brand.schema';

type BrandRow = Database['public']['Tables']['brands']['Row'];

/**
 * Reference pattern for a create/edit form: `@refinedev/react-hook-form`
 * wires plain `react-hook-form` to the same Refine `dataProvider` used for
 * reads, Zod owns client-side validation, and `saveButtonProps` submits
 * straight to the `brands` resource. On success, Refine invalidates the
 * `brands` list query automatically — no manual `refetch()` call needed.
 */
export function useBrandForm(params: { mode: 'create' | 'edit'; id?: string }) {
  return useForm<BrandRow, HttpError, BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: brandFormDefaultValues,
    refineCoreProps: {
      resource: 'brands',
      action: params.mode,
      id: params.id,
      redirect: false,
    },
  });
}
