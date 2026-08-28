import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './button';

describe('Kisok shadcn button', () => {
  it('renders the shared quiet operational variant from the official shadcn source', () => {
    render(<Button variant="quiet">Review local change</Button>);

    expect(screen.getByRole('button', { name: 'Review local change' })).toHaveClass(
      'border-border',
    );
    expect(screen.getByRole('button', { name: 'Review local change' })).toHaveClass(
      'text-muted-foreground',
    );
  });
});
