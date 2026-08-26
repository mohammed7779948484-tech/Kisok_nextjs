import type { InventoryDataContract, LocalInventoryRecord } from '../types';

export const localInventoryRecords: readonly LocalInventoryRecord[] = [
  { available: 3, lastAction: 'Manual increase', product: 'Arabic Reserve', threshold: 5 },
  { available: 7, lastAction: 'Stock take', product: 'Ceremony Matcha', threshold: 8 },
  { available: 18, lastAction: 'Delivery received', product: 'Midnight Roast', threshold: 5 },
];

export const localInventoryContract: InventoryDataContract = {
  list: () => localInventoryRecords,
};
