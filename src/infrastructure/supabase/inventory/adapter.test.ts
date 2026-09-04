import { describe, expect, it } from 'vitest';

import { applyInventoryAdjustment, setInventoryQuantity } from './adapter';

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
        adjustmentType: 'stock_received',
        quantityChange: 3,
        reason: 'Delivery received',
      }),
    ).resolves.toEqual({ quantityAfter: 8, adjustmentId: 'adjustment-1' });

    expect(calls).toEqual([
      {
        name: 'apply_inventory_adjustment',
        args: {
          variant_id: 'variant-1',
          type: 'stock_received',
          delta: 3,
          reason: 'Delivery received',
        },
      },
    ]);
  });
});

describe('setInventoryQuantity', () => {
  it('calls the Lean V2 Set Quantity RPC with the generated argument names', async () => {
    const calls: Array<{ name: string; args: unknown }> = [];
    const client = {
      rpc: async (name: string, args: unknown) => {
        calls.push({ name, args });
        return { data: { quantity_after: 5, adjustment_id: 'adjustment-2' }, error: null };
      },
    };

    await expect(
      setInventoryQuantity(client, {
        variantId: 'variant-1',
        finalQuantity: 5,
        reason: 'Stock count correction',
      }),
    ).resolves.toEqual({ quantityAfter: 5, adjustmentId: 'adjustment-2' });

    expect(calls).toEqual([
      {
        name: 'set_inventory_quantity',
        args: {
          variant_id: 'variant-1',
          final_quantity: 5,
          reason: 'Stock count correction',
        },
      },
    ]);
  });
});
