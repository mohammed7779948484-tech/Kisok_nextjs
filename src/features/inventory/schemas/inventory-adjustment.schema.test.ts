import { describe, expect, it } from 'vitest';

import {
  applyChangeSchema,
  setQuantitySchema,
  toSignedInventoryDelta,
} from './inventory-adjustment.schema';

describe('inventory-adjustment schemas', () => {
  describe('applyChangeSchema', () => {
    it('accepts valid adjustment input', () => {
      const result = applyChangeSchema.safeParse({
        adjustmentType: 'stock_received',
        quantityChange: 10,
        reason: 'Weekly supplier restock',
      });
      expect(result.success).toBe(true);
    });

    it('rejects zero or negative quantities', () => {
      const zeroResult = applyChangeSchema.safeParse({
        adjustmentType: 'manual_increase',
        quantityChange: 0,
        reason: 'No change',
      });
      expect(zeroResult.success).toBe(false);

      const negativeResult = applyChangeSchema.safeParse({
        adjustmentType: 'manual_decrease',
        quantityChange: -5,
        reason: 'Broken units',
      });
      expect(negativeResult.success).toBe(false);
    });

    it('rejects empty or whitespace-only reason', () => {
      const result = applyChangeSchema.safeParse({
        adjustmentType: 'damaged_or_expired',
        quantityChange: 2,
        reason: '   ',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('setQuantitySchema', () => {
    it('accepts non-negative integer quantity including zero', () => {
      const result = setQuantitySchema.safeParse({
        finalQuantity: 0,
        reason: 'Physical count verified out of stock',
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative final quantity', () => {
      const result = setQuantitySchema.safeParse({
        finalQuantity: -1,
        reason: 'Correction',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty reason', () => {
      const result = setQuantitySchema.safeParse({
        finalQuantity: 15,
        reason: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('toSignedInventoryDelta', () => {
    it('returns positive delta for stock_received and manual_increase', () => {
      expect(toSignedInventoryDelta('stock_received', 10)).toBe(10);
      expect(toSignedInventoryDelta('manual_increase', 5)).toBe(5);
    });

    it('returns negative delta for manual_decrease and damaged_or_expired', () => {
      expect(toSignedInventoryDelta('manual_decrease', 4)).toBe(-4);
      expect(toSignedInventoryDelta('damaged_or_expired', 3)).toBe(-3);
    });
  });
});
