import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KisokButton, StatusPill } from '.';

describe('shared UI shadcn bridge', () => {
  it('exposes the official shadcn button through the shared compatibility boundary', () => {
    render(<KisokButton variant="quiet">Local review</KisokButton>);

    expect(screen.getByRole('button', { name: 'Local review' })).toHaveAttribute(
      'data-slot',
      'button',
    );
  });

  it('renders operational status through the official shadcn badge primitive', () => {
    render(<StatusPill>Ready for review</StatusPill>);

    expect(screen.getByText('Ready for review')).toHaveAttribute('data-slot', 'badge');
    expect(screen.getByText('Ready for review')).toHaveClass('border-border');
  });

  it('exposes semantic status tones without caller-owned color values', () => {
    render(<StatusPill tone="success">Active</StatusPill>);

    expect(screen.getByText('Active')).toHaveClass('text-success');
  });
});
