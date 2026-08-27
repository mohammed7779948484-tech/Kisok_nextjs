import { z } from 'zod';

function isValidIanaTimezone(value: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function integerField(message: string, min: number) {
  return z
    .string()
    .trim()
    .transform((value, context) => {
      const number = Number(value);
      if (!(Number.isFinite(number) && Number.isInteger(number)) || number < min) {
        context.addIssue({ code: 'custom', message });
        return z.NEVER;
      }
      return number;
    });
}

export const storeSettingsSchema = z.object({
  store_name: z.string().trim().min(1, 'Enter a store name.'),
  global_low_stock_threshold: integerField('Enter a whole number, zero or greater.', 0),
  customer_success_reset_seconds: integerField('Enter a whole number of at least 1 second.', 1),
  store_timezone: z
    .string()
    .trim()
    .min(1, 'Enter a timezone.')
    .refine(isValidIanaTimezone, 'Enter a valid IANA timezone, such as UTC or Asia/Riyadh.'),
  logo_media_asset_id: z.string().nullable(),
});

export type StoreSettingsFormValues = z.input<typeof storeSettingsSchema>;
export type StoreSettingsValues = z.output<typeof storeSettingsSchema>;

export const storeSettingsFormDefaultValues: StoreSettingsFormValues = {
  store_name: '',
  global_low_stock_threshold: '0',
  customer_success_reset_seconds: '60',
  store_timezone: 'UTC',
  logo_media_asset_id: null,
};
