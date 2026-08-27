import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CompactPagination } from './CompactPagination';

describe('CompactPagination', () => {
  it('renders nothing for a single page', () => {
    const { container } = render(
      <CompactPagination onPageChange={vi.fn()} page={1} totalPages={1} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a bounded window of page links with ellipses for a large total', () => {
    render(<CompactPagination onPageChange={vi.fn()} page={50} totalPages={200} />);

    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '200' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '50' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '2' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBeLessThan(10);
  });

  it('calls onPageChange with the clicked page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<CompactPagination onPageChange={onPageChange} page={3} totalPages={5} />);

    await user.click(screen.getByRole('button', { name: '4' }));

    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('disables Previous on the first page and Next on the last page', () => {
    render(<CompactPagination onPageChange={vi.fn()} page={1} totalPages={3} />);

    expect(screen.getByLabelText('Go to previous page')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByLabelText('Go to next page')).toHaveAttribute('aria-disabled', 'false');
  });
});
