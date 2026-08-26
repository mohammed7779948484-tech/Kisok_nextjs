import type {
  InventoryAdjustmentInput,
  InventoryAdjustmentResult,
  SetInventoryQuantityInput,
} from '@/infrastructure/supabase/inventory/adapter';

export interface InventoryRecord {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string | null;
  currentQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
}

export interface InventoryDataContract {
  list(): Promise<InventoryRecord[]>;
  applyAdjustment(input: InventoryAdjustmentInput): Promise<InventoryAdjustmentResult>;
  setQuantity(input: SetInventoryQuantityInput): Promise<InventoryAdjustmentResult>;
}
