import { describe, expect, it } from 'vitest';

import { storeSettingsSchema } from './store-settings.schema';

const validInput = {
  store_name: 'Kisok Harbour',
  global_low_stock_threshold: '8',
  customer_success_reset_seconds: '90',
  store_timezone: 'UTC',
  logo_media_asset_id: null,
};

describe('storeSettingsSchema', () => {
  it('accepts a complete, valid set of Lean V2 Store Settings fields', () => {
    const result = storeSettingsSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        store_name: 'Kisok Harbour',
        global_low_stock_threshold: 8,
        customer_success_reset_seconds: 90,
        store_timezone: 'UTC',
        logo_media_asset_id: null,
      });
    }
  });

  it('rejects a blank store name', () => {
    const result = storeSettingsSchema.safeParse({ ...validInput, store_name: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects a negative low-stock threshold', () => {
    const result = storeSettingsSchema.safeParse({
      ...validInput,
      global_low_stock_threshold: '-1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer low-stock threshold', () => {
    const result = storeSettingsSchema.safeParse({
      ...validInput,
      global_low_stock_threshold: '1.5',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a customer success reset below one second', () => {
    const result = storeSettingsSchema.safeParse({
      ...validInput,
      customer_success_reset_seconds: '0',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a timezone that is not a valid IANA identifier', () => {
    const result = storeSettingsSchema.safeParse({
      ...validInput,
      store_timezone: 'not-a-timezone',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a null logo media asset id', () => {
    expect(
      storeSettingsSchema.safeParse({ ...validInput, logo_media_asset_id: null }).success,
    ).toBe(true);
  });

  it('accepts a selected logo media asset id', () => {
    expect(
      storeSettingsSchema.safeParse({ ...validInput, logo_media_asset_id: 'media-1' }).success,
    ).toBe(true);
  });
});
