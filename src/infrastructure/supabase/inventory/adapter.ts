import type { Database } from '@/infrastructure/supabase/database.types';

export type InventoryAdjustmentType = Exclude<
  Database['public']['Enums']['inventory_adjustment_type'],
  'order_deduction' | 'order_cancellation_restoration'
>;

export type InventoryAdjustmentInput = {
  adjustmentType: InventoryAdjustmentType;
  quantityChange: number;
  reason: string;
  variantId: string;
};

export type InventoryAdjustmentResult = {
  adjustmentId: string;
  quantityAfter: number;
};

type ApplyInventoryAdjustmentArgs =
  Database['public']['Functions']['apply_inventory_adjustment']['Args'];
type SetInventoryQuantityArgs = Database['public']['Functions']['set_inventory_quantity']['Args'];

type InventoryRpcClient = {
  rpc: (
    name: 'apply_inventory_adjustment' | 'set_inventory_quantity',
    args: ApplyInventoryAdjustmentArgs | SetInventoryQuantityArgs,
  ) => PromiseLike<{ data: unknown; error: unknown | null }>;
};

export async function applyInventoryAdjustment(
  client: InventoryRpcClient,
  input: InventoryAdjustmentInput,
): Promise<InventoryAdjustmentResult> {
  const { data, error } = await client.rpc('apply_inventory_adjustment', {
    variant_id: input.variantId,
    type: input.adjustmentType,
    delta: input.quantityChange,
    reason: input.reason,
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

export type SetInventoryQuantityInput = {
  finalQuantity: number;
  reason: string;
  variantId: string;
};

export async function setInventoryQuantity(
  client: InventoryRpcClient,
  input: SetInventoryQuantityInput,
): Promise<InventoryAdjustmentResult> {
  const { data, error } = await client.rpc('set_inventory_quantity', {
    variant_id: input.variantId,
    final_quantity: input.finalQuantity,
    reason: input.reason,
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
