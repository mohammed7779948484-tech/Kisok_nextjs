'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type HistoryFilterType =
  | 'all'
  | 'stock_received'
  | 'manual_increase'
  | 'manual_decrease'
  | 'damaged_or_expired'
  | 'order_deduction'
  | 'order_cancellation_restoration'
  | 'initial_stock';

export interface InventoryHistoryFilterProps {
  onTypeChange: (type: HistoryFilterType) => void;
  selectedType: HistoryFilterType;
}

const FILTER_OPTIONS: { label: string; value: HistoryFilterType }[] = [
  { value: 'all', label: 'All adjustment types' },
  { value: 'stock_received', label: 'Stock received' },
  { value: 'manual_increase', label: 'Manual increase' },
  { value: 'manual_decrease', label: 'Manual decrease' },
  { value: 'damaged_or_expired', label: 'Damaged or expired' },
  { value: 'order_deduction', label: 'Order deduction' },
  { value: 'order_cancellation_restoration', label: 'Cancellation restored' },
  { value: 'initial_stock', label: 'Initial stock' },
];

export function InventoryHistoryFilter({
  onTypeChange,
  selectedType,
}: InventoryHistoryFilterProps) {
  return (
    <div className="w-full sm:w-56">
      <Select onValueChange={(val) => onTypeChange(val as HistoryFilterType)} value={selectedType}>
        <SelectTrigger aria-label="Filter adjustment type" className="h-9 w-full">
          <SelectValue placeholder="All adjustment types" />
        </SelectTrigger>
        <SelectContent>
          {FILTER_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
