export interface LocalInventoryRecord {
  available: number;
  lastAction: string;
  product: string;
  threshold: number;
}

export interface InventoryDataContract {
  list(): readonly LocalInventoryRecord[];
}
