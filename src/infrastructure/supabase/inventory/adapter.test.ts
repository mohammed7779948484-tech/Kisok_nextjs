import { describe, expect, it } from 'vitest';

import { applyInventoryAdjustment } from './adapter';

describe('applyInventoryAdjustment', () => {
  it('calls the Lean V2 ledger RPC and returns the verified quantity result', async () => {
    const calls: Array<{ name: string; args: unknown }> = [];
    const client = {
      rpc: async (name: string, args: unknown) => {
        calls.push({ name, args });
        return { data: { quantity_after: 8, adjustment_id: 'adjustment-1' }, error: null };
      },
    };

    await expect(
      applyInventoryAdjustment(client, {
        variantId: 'variant-1',
        adjustmentType: 'received',
        quantityChange: 3,
        reason: 'Delivery received',
      }),
    ).resolves.toEqual({ quantityAfter: 8, adjustmentId: 'adjustment-1' });

    expect(calls).toEqual([
      {
        name: 'apply_inventory_adjustment',
        args: {
          p_variant_id: 'variant-1',
          p_adjustment_type: 'received',
          p_quantity_change: 3,
          p_reason: 'Delivery received',
        },
      },
    ]);
  });
});
