import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InventoryExportAction } from './InventoryExportAction';

describe('InventoryExportAction', () => {
  it('renders export buttons and triggers export callbacks', () => {
    const onExportStock = vi.fn();
    const onExportHistory = vi.fn();

    render(
      <InventoryExportAction
        activeTab="stock"
        onExportHistory={onExportHistory}
        onExportStock={onExportStock}
      />,
    );

    const exportBtn = screen.getByRole('button', { name: /export stock csv/i });
    expect(exportBtn).toBeInTheDocument();
    fireEvent.click(exportBtn);
    expect(onExportStock).toHaveBeenCalledTimes(1);
  });

  it('renders export history button when activeTab is history', () => {
    const onExportStock = vi.fn();
    const onExportHistory = vi.fn();

    render(
      <InventoryExportAction
        activeTab="history"
        onExportHistory={onExportHistory}
        onExportStock={onExportStock}
      />,
    );

    const exportBtn = screen.getByRole('button', { name: /export history csv/i });
    expect(exportBtn).toBeInTheDocument();
    fireEvent.click(exportBtn);
    expect(onExportHistory).toHaveBeenCalledTimes(1);
  });
});
