import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrderNotificationCenter } from './OrderNotificationCenter';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('OrderNotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders sound toggle control and toggles state', () => {
    render(<OrderNotificationCenter locale="en" />);

    const soundButton = screen.getByRole('button', { name: /mute notification sound/i });
    expect(soundButton).toBeInTheDocument();

    fireEvent.click(soundButton);
    expect(screen.getByRole('button', { name: /unmute notification sound/i })).toBeInTheDocument();
  });

  it('displays notification toast when latestOrder is provided and allows navigation', () => {
    const onDismiss = vi.fn();
    const mockOrder = {
      id: 'ord-99',
      displayNumber: 'ORD-99',
      status: 'new' as const,
      createdAt: new Date().toISOString(),
    };

    render(<OrderNotificationCenter latestOrder={mockOrder} locale="en" onDismiss={onDismiss} />);

    expect(screen.getByText(/New order ORD-99/i)).toBeInTheDocument();

    const viewButton = screen.getByRole('button', { name: /view in queue/i });
    fireEvent.click(viewButton);

    expect(mockPush).toHaveBeenCalledWith('/en/admin/orders');
    expect(onDismiss).toHaveBeenCalled();
  });

  it('dismisses toast when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    const mockOrder = {
      id: 'ord-100',
      displayNumber: 'ORD-100',
      status: 'new' as const,
      createdAt: new Date().toISOString(),
    };

    render(<OrderNotificationCenter latestOrder={mockOrder} locale="en" onDismiss={onDismiss} />);

    const dismissButton = screen.getByRole('button', { name: /dismiss notification/i });
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalled();
  });
});
