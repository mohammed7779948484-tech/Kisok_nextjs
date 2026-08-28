import type {
  InventoryAdjustmentInput,
  InventoryAdjustmentResult,
  SetInventoryQuantityInput,
} from '@/infrastructure/supabase/inventory/adapter';

export interface InventoryRecord {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  barcode: string | null;
  currentQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
}

export interface InventoryHistoryRecord {
  id: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  type: string;
  delta: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string | null;
  createdAt: string;
}

export interface InventoryDataContract {
  list(): Promise<InventoryRecord[]>;
  listHistory(search?: string): Promise<InventoryHistoryRecord[]>;
  applyAdjustment(input: InventoryAdjustmentInput): Promise<InventoryAdjustmentResult>;
  setQuantity(input: SetInventoryQuantityInput): Promise<InventoryAdjustmentResult>;
}
