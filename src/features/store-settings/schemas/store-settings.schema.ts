import { z } from 'zod';

export const storeSettingsSchema = z.object({
  lowStockThreshold: z.string().trim().min(1),
  orderReset: z.string().trim().min(1),
  storeIdentity: z.string().trim().min(1),
});
