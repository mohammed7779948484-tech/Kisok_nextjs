import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  listInventory: vi.fn(),
  listHistory: vi.fn(),
  applyAdjustment: vi.fn(),
  setQuantity: vi.fn(),
}));

vi.mock('../repositories', () => ({
  inventoryRepository: {
    list: testContext.listInventory,
    listHistory: testContext.listHistory,
    applyAdjustment: testContext.applyAdjustment,
    setQuantity: testContext.setQuantity,
  },
}));

import { InventoryPanel } from './InventoryPanel';

const mockInventory = [
  {
    variantId: 'variant-1',
    productId: 'product-1',
    productName: 'Berry Spark',
    variantName: 'Berry · Small',
    sku: 'KSK-000001',
    barcode: '111222333',
    currentQuantity: 3,
    lowStockThreshold: 4,
    isLowStock: true,
  },
  {
    variantId: 'variant-2',
    productId: 'product-2',
    productName: 'Golden Roast',
    variantName: 'Whole Bean · 500g',
    sku: 'KSK-000002',
    barcode: null,
    currentQuantity: 20,
    lowStockThreshold: 5,
    isLowStock: false,
  },
];

const mockHistory = [
  {
    id: 'adj-1',
    variantId: 'variant-1',
    productName: 'Berry Spark',
    variantName: 'Berry · Small',
    sku: 'KSK-000001',
    type: 'stock_received',
    delta: 10,
    quantityBefore: 0,
    quantityAfter: 10,
    reason: 'First inventory delivery',
    createdAt: '2026-08-27T10:00:00Z',
  },
];

describe('InventoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testContext.listInventory.mockResolvedValue(mockInventory);
    testContext.listHistory.mockResolvedValue(mockHistory);
    testContext.applyAdjustment.mockResolvedValue({
      adjustmentId: 'adj-2',
      quantityAfter: 5,
    });
    testContext.setQuantity.mockResolvedValue({
      adjustmentId: 'adj-3',
      quantityAfter: 8,
    });
  });

  it('renders inventory stock table with totals and status indicators', async () => {
    render(<InventoryPanel />);

    expect(await screen.findByText('Berry Spark')).toBeInTheDocument();
    expect(screen.getByText('Golden Roast')).toBeInTheDocument();
    expect(screen.getByText(/Total variants/i)).toBeInTheDocument();
    expect(screen.getByText(/Total stock units/i)).toBeInTheDocument();
    expect(screen.getByText(/Export Stock CSV/i)).toBeInTheDocument();
  });

  it('filters stock rows by search input', async () => {
    const user = userEvent.setup();
    render(<InventoryPanel />);

    await screen.findByText('Berry Spark');
    const searchInput = screen.getByPlaceholderText(/search by product, sku, or barcode/i);

    await user.type(searchInput, 'Golden');

    expect(screen.queryByText('Berry Spark')).not.toBeInTheDocument();
    expect(screen.getByText('Golden Roast')).toBeInTheDocument();
  });

  it('filters stock rows when clicking low stock toggle button', async () => {
    const user = userEvent.setup();
    render(<InventoryPanel />);

    await screen.findByText('Berry Spark');
    const filterBtn = screen.getByRole('button', { name: /filter low stock/i });

    await user.click(filterBtn);

    expect(screen.getByText('Berry Spark')).toBeInTheDocument();
    expect(screen.queryByText('Golden Roast')).not.toBeInTheDocument();
  });

  it('switches to adjustment history tab and displays historical records', async () => {
    const user = userEvent.setup();
    render(<InventoryPanel />);

    await screen.findByText('Berry Spark');
    const historyTab = screen.getByRole('tab', { name: /adjustment history/i });

    await user.click(historyTab);

    expect(await screen.findByText('First inventory delivery')).toBeInTheDocument();
    expect(screen.getByText('+10')).toBeInTheDocument();
  });

  it('opens adjustment dialog and submits stock adjustment', async () => {
    const user = userEvent.setup();
    render(<InventoryPanel />);

    await screen.findByText('Berry Spark');
    const adjustButtons = screen.getAllByRole('button', { name: /adjust/i });

    await user.click(adjustButtons[0]);

    expect(await screen.findByText(/Adjust stock: Berry Spark/i)).toBeInTheDocument();

    const quantityInput = screen.getByRole('spinbutton', { name: /^quantity/i });
    const reasonInput = screen.getByPlaceholderText(/supplier delivery/i);

    await user.clear(quantityInput);
    await user.type(quantityInput, '2');
    await user.type(reasonInput, 'Restock batch');

    const saveBtn = screen.getByRole('button', { name: /save adjustment/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(testContext.applyAdjustment).toHaveBeenCalledWith({
        variantId: 'variant-1',
        adjustmentType: 'stock_received',
        quantityChange: 2,
        reason: 'Restock batch',
      });
    });
  });

  it('opens adjustment dialog and submits set final quantity', async () => {
    const user = userEvent.setup();
    render(<InventoryPanel />);

    await screen.findByText('Berry Spark');
    const adjustButtons = screen.getAllByRole('button', { name: /adjust/i });

    await user.click(adjustButtons[0]);

    const setQuantityTab = screen.getByRole('tab', { name: /set final quantity/i });
    await user.click(setQuantityTab);

    const finalQuantityInput = screen.getByRole('spinbutton', { name: /final quantity/i });
    const reasonInput = screen.getByPlaceholderText(/physical recount/i);

    await user.clear(finalQuantityInput);
    await user.type(finalQuantityInput, '10');
    await user.type(reasonInput, 'Physical inventory recount');

    const saveBtn = screen.getByRole('button', { name: /save quantity/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(testContext.setQuantity).toHaveBeenCalledWith({
        variantId: 'variant-1',
        finalQuantity: 10,
        reason: 'Physical inventory recount',
      });
    });
  });
});
