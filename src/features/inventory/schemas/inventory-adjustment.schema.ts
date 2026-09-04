import { z } from 'zod';

import type { InventoryAdjustmentType } from '@/infrastructure/supabase/inventory/adapter';

export const ADJUSTMENT_TYPES = [
  'stock_received',
  'manual_increase',
  'manual_decrease',
  'damaged_or_expired',
] as const;

export type AllowedAdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

export const applyChangeSchema = z.object({
  adjustmentType: z.enum(ADJUSTMENT_TYPES),
  quantityChange: z
    .number({ message: 'Enter a valid whole number.' })
    .int('Quantity must be an integer.')
    .positive('Quantity must be greater than zero.'),
  reason: z
    .string()
    .trim()
    .min(1, 'An adjustment reason is required.')
    .max(500, 'Reason must be 500 characters or fewer.'),
});

export type ApplyChangeFormValues = z.infer<typeof applyChangeSchema>;

export const setQuantitySchema = z.object({
  finalQuantity: z
    .number({ message: 'Enter a valid whole number.' })
    .int('Quantity must be an integer.')
    .min(0, 'Quantity cannot be negative.'),
  reason: z
    .string()
    .trim()
    .min(1, 'A reason is required for setting final stock.')
    .max(500, 'Reason must be 500 characters or fewer.'),
});

export type SetQuantityFormValues = z.infer<typeof setQuantitySchema>;

export function toSignedInventoryDelta(type: InventoryAdjustmentType, quantity: number): number {
  const abs = Math.abs(quantity);
  return type === 'manual_decrease' || type === 'damaged_or_expired' ? -abs : abs;
}
