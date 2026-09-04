import { describe, expect, it } from 'vitest';

import type { InventoryHistoryRecord, InventoryRecord } from '../types';
import { generateHistoryCsv, generateStockCsv } from './inventory-export';

const mockStockRows: InventoryRecord[] = [
  {
    variantId: 'var-1',
    productId: 'prod-1',
    productName: 'Berry Spark',
    variantName: 'Berry · Small',
    sku: 'KSK-000001',
    barcode: '111222333',
    currentQuantity: 12,
    lowStockThreshold: 5,
    isLowStock: false,
  },
  {
    variantId: 'var-2',
    productId: 'prod-2',
    productName: 'Golden Roast, Special',
    variantName: 'Whole Bean · 500g',
    sku: 'KSK-000002',
    barcode: null,
    currentQuantity: 2,
    lowStockThreshold: 5,
    isLowStock: true,
  },
];

const mockHistoryRows: InventoryHistoryRecord[] = [
  {
    id: 'adj-1',
    variantId: 'var-1',
    productName: 'Berry Spark',
    variantName: 'Berry · Small',
    sku: 'KSK-000001',
    type: 'stock_received',
    delta: 10,
    quantityBefore: 2,
    quantityAfter: 12,
    reason: 'Shipment received, batch #42',
    createdAt: '2026-08-28T00:00:00Z',
  },
];

describe('inventory-export utilities', () => {
  it('generates properly formatted CSV for stock records', () => {
    const csv = generateStockCsv(mockStockRows);

    expect(csv).toContain('Product Name,Variant,SKU,Barcode,Quantity,Threshold,Status');
    expect(csv).toContain('"Berry Spark","Berry · Small","KSK-000001","111222333",12,5,"Healthy"');
    expect(csv).toContain(
      '"Golden Roast, Special","Whole Bean · 500g","KSK-000002","—",2,5,"Review"',
    );
  });

  it('generates properly formatted CSV for history records', () => {
    const csv = generateHistoryCsv(mockHistoryRows);

    expect(csv).toContain(
      'Date,Product Name,Variant,SKU,Type,Change,Quantity Before,Quantity After,Reason',
    );
    expect(csv).toContain(
      '"Berry Spark","Berry · Small","KSK-000001","Stock received",+10,2,12,"Shipment received, batch #42"',
    );
  });
});
