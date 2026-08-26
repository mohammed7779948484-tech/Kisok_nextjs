import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * `supabase/seed.sql` is applied by `supabase db reset` (and by anyone
 * seeding a fresh database). These are static, DB-connection-free
 * regression checks for two Lean V2 seed defects a previous review found:
 * invalid `display_number` values and an inventory ledger that disagreed
 * with the `current_quantity` column it seeded.
 */
const seedSql = readFileSync(resolve(import.meta.dirname, '../supabase/seed.sql'), 'utf8');

// Mirrors the CHECK constraint in
// supabase/migrations/20260826050004_lean_inventory_orders_schema.sql.
const DISPLAY_NUMBER_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

function extractOrderDisplayNumbers(sql: string): string[] {
  const pattern = /\('80000000-0000-0000-0000-\d+',\s*'([^']+)'/g;
  return [...sql.matchAll(pattern)].map((match) => match[1]);
}

function extractInventoryAdjustmentDeltas(sql: string): Map<string, number> {
  const pattern = /\('70000000-0000-0000-0000-\d+',\s*'(60000000-0000-0000-0000-\d+)',\s*(-?\d+),/g;
  const totals = new Map<string, number>();
  for (const match of sql.matchAll(pattern)) {
    const variantId = match[1];
    const delta = Number(match[2]);
    totals.set(variantId, (totals.get(variantId) ?? 0) + delta);
  }
  return totals;
}

function extractSeededCurrentQuantities(sql: string): Map<string, number> {
  const pattern = /when\s+'(60000000-0000-0000-0000-\d+)'\s+then\s+(\d+)/g;
  const values = new Map<string, number>();
  for (const match of sql.matchAll(pattern)) {
    values.set(match[1], Number(match[2]));
  }
  return values;
}

describe('supabase/seed.sql coherence', () => {
  it('uses only display_number values that satisfy the Lean V2 CHECK constraint', () => {
    const displayNumbers = extractOrderDisplayNumbers(seedSql);

    expect(displayNumbers.length).toBeGreaterThan(0);
    for (const displayNumber of displayNumbers) {
      expect(displayNumber).toMatch(DISPLAY_NUMBER_PATTERN);
    }
  });

  it('seeds inventory.current_quantity as the exact sum of its inventory_adjustments ledger', () => {
    const ledgerTotals = extractInventoryAdjustmentDeltas(seedSql);
    const seededQuantities = extractSeededCurrentQuantities(seedSql);

    expect(seededQuantities.size).toBeGreaterThan(0);
    for (const [variantId, seededQuantity] of seededQuantities) {
      expect(ledgerTotals.get(variantId)).toBe(seededQuantity);
    }
  });
});
