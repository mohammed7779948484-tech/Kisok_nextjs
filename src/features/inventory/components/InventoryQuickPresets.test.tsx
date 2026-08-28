import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InventoryQuickPresets } from './InventoryQuickPresets';

describe('InventoryQuickPresets', () => {
  it('renders quick preset buttons and triggers onSelect with delta', () => {
    const onSelect = vi.fn();
    render(<InventoryQuickPresets onSelect={onSelect} />);

    expect(screen.getByText('+5')).toBeInTheDocument();
    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(screen.getByText('+25')).toBeInTheDocument();
    expect(screen.getByText('+50')).toBeInTheDocument();
    expect(screen.getByText('+100')).toBeInTheDocument();

    fireEvent.click(screen.getByText('+25'));
    expect(onSelect).toHaveBeenCalledWith(25);
  });
});
