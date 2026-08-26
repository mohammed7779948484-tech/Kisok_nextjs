import type { ListDataContract } from '@/shared/contracts';

export interface LocalInventoryRecord {
  available: number;
  lastAction: string;
  product: string;
  threshold: number;
}

export interface InventoryDataContract extends ListDataContract<LocalInventoryRecord> {}
