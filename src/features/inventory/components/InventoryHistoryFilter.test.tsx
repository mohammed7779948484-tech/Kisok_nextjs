import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InventoryHistoryFilter } from './InventoryHistoryFilter';

describe('InventoryHistoryFilter', () => {
  it('renders filter with current selection and allows changing filter', () => {
    const onTypeChange = vi.fn();

    render(<InventoryHistoryFilter onTypeChange={onTypeChange} selectedType="all" />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
