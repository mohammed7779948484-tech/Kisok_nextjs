import { describe, expect, it } from 'vitest';

import { storeSettingsSchema } from './store-settings.schema';

describe('storeSettingsSchema', () => {
  it('rejects a blank store identity while accepting complete operational settings', () => {
    expect(
      storeSettingsSchema.safeParse({
        lowStockThreshold: '08 units',
        orderReset: 'Manual approval after completion',
        storeIdentity: '',
      }).success,
    ).toBe(false);

    expect(
      storeSettingsSchema.safeParse({
        lowStockThreshold: '08 units',
        orderReset: 'Manual approval after completion',
        storeIdentity: 'Kisok Harbour',
      }).success,
    ).toBe(true);
  });
});
