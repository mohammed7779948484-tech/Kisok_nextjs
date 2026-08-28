import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReorderButtonGroup } from './ReorderButtonGroup';

describe('ReorderButtonGroup', () => {
  it('renders move up and move down buttons with proper accessible labels', () => {
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();

    render(
      <ReorderButtonGroup
        hasActiveSearch={false}
        isFirst={false}
        isLast={false}
        isReordering={false}
        itemName="Beverages"
        onMoveDown={onMoveDown}
        onMoveUp={onMoveUp}
      />,
    );

    const upButton = screen.getByRole('button', { name: /move beverages up/i });
    const downButton = screen.getByRole('button', { name: /move beverages down/i });

    expect(upButton).not.toBeDisabled();
    expect(downButton).not.toBeDisabled();

    fireEvent.click(upButton);
    expect(onMoveUp).toHaveBeenCalledTimes(1);

    fireEvent.click(downButton);
    expect(onMoveDown).toHaveBeenCalledTimes(1);
  });

  it('disables up button when isFirst is true', () => {
    render(
      <ReorderButtonGroup
        hasActiveSearch={false}
        isFirst={true}
        isLast={false}
        isReordering={false}
        itemName="Top Item"
        onMoveDown={vi.fn()}
        onMoveUp={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /move top item up/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move top item down/i })).not.toBeDisabled();
  });

  it('disables down button when isLast is true', () => {
    render(
      <ReorderButtonGroup
        hasActiveSearch={false}
        isFirst={false}
        isLast={true}
        isReordering={false}
        itemName="Bottom Item"
        onMoveDown={vi.fn()}
        onMoveUp={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /move bottom item up/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /move bottom item down/i })).toBeDisabled();
  });

  it('disables both buttons when search is active to prevent invisible reorder corruption', () => {
    render(
      <ReorderButtonGroup
        hasActiveSearch={true}
        isFirst={false}
        isLast={false}
        isReordering={false}
        itemName="Filtered Item"
        onMoveDown={vi.fn()}
        onMoveUp={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /move filtered item up/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move filtered item down/i })).toBeDisabled();
  });

  it('disables both buttons when isReordering is true', () => {
    render(
      <ReorderButtonGroup
        hasActiveSearch={false}
        isFirst={false}
        isLast={false}
        isReordering={true}
        itemName="Item"
        onMoveDown={vi.fn()}
        onMoveUp={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /move item up/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move item down/i })).toBeDisabled();
  });
});
