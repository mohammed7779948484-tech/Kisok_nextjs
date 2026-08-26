export type InventoryAdjustmentType =
  | 'initial_stock'
  | 'manual_adjustment'
  | 'order_cancellation_restoration'
  | 'order_deduction'
  | 'received'
  | 'returned';

export type InventoryAdjustmentInput = {
  adjustmentType: InventoryAdjustmentType;
  quantityChange: number;
  reason: string | null;
  variantId: string;
};

export type InventoryAdjustmentResult = {
  adjustmentId: string;
  quantityAfter: number;
};

type InventoryRpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown | null }>;
};

export async function applyInventoryAdjustment(
  client: InventoryRpcClient,
  input: InventoryAdjustmentInput,
): Promise<InventoryAdjustmentResult> {
  const { data, error } = await client.rpc('apply_inventory_adjustment', {
    p_variant_id: input.variantId,
    p_adjustment_type: input.adjustmentType,
    p_quantity_change: input.quantityChange,
    p_reason: input.reason,
  });

  if (error) {
    throw error;
  }

  const payload = Array.isArray(data) ? data[0] : data;

  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof (payload as { quantity_after?: unknown }).quantity_after !== 'number' ||
    typeof (payload as { adjustment_id?: unknown }).adjustment_id !== 'string'
  ) {
    throw new Error('Inventory RPC returned an invalid result.');
  }

  const result = payload as { adjustment_id: string; quantity_after: number };
  return {
    adjustmentId: result.adjustment_id,
    quantityAfter: result.quantity_after,
  };
}

export type InventorySupabaseAdapter = {
  readonly connection: 'ready';
  readonly applyInventoryAdjustment: typeof applyInventoryAdjustment;
};
