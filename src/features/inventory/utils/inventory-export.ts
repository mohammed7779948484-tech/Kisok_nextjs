import type { InventoryHistoryRecord, InventoryRecord } from '../types';

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '""';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  const str = String(value).replaceAll('"', '""');
  return `"${str}"`;
}

function formatAdjustmentType(type: string): string {
  switch (type) {
    case 'stock_received':
      return 'Stock received';
    case 'manual_increase':
      return 'Manual increase';
    case 'manual_decrease':
      return 'Manual decrease';
    case 'damaged_or_expired':
      return 'Damaged or expired';
    case 'order_deduction':
      return 'Order deduction';
    case 'order_cancellation_restoration':
      return 'Cancellation restored';
    case 'initial_stock':
      return 'Initial stock';
    default:
      return type.replaceAll('_', ' ');
  }
}

export function generateStockCsv(rows: InventoryRecord[]): string {
  const header = ['Product Name', 'Variant', 'SKU', 'Barcode', 'Quantity', 'Threshold', 'Status'];

  const lines = rows.map((row) => [
    escapeCsvField(row.productName),
    escapeCsvField(row.variantName || '—'),
    escapeCsvField(row.sku),
    escapeCsvField(row.barcode || '—'),
    row.currentQuantity,
    row.lowStockThreshold,
    escapeCsvField(row.isLowStock ? 'Review' : 'Healthy'),
  ]);

  return [header.join(','), ...lines.map((l) => l.join(','))].join('\r\n');
}

export function generateHistoryCsv(rows: InventoryHistoryRecord[]): string {
  const header = [
    'Date',
    'Product Name',
    'Variant',
    'SKU',
    'Type',
    'Change',
    'Quantity Before',
    'Quantity After',
    'Reason',
  ];

  const lines = rows.map((row) => {
    const formattedDate = new Date(row.createdAt).toISOString();
    const formattedDelta = row.delta > 0 ? `+${row.delta}` : String(row.delta);
    return [
      escapeCsvField(formattedDate),
      escapeCsvField(row.productName),
      escapeCsvField(row.variantName || '—'),
      escapeCsvField(row.sku),
      escapeCsvField(formatAdjustmentType(row.type)),
      formattedDelta,
      row.quantityBefore,
      row.quantityAfter,
      escapeCsvField(row.reason || '—'),
    ];
  });

  return [header.join(','), ...lines.map((l) => l.join(','))].join('\r\n');
}

export function downloadCsv(filename: string, content: string): void {
  // UTF-8 BOM helps Excel open UTF-8 CSVs properly
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
