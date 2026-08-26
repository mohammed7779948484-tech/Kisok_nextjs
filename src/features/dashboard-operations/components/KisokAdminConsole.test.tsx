import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KisokAdminConsole } from './KisokAdminConsole';

describe('KisokAdminConsole', () => {
  it('opens a local access gate without presenting it as production authentication', () => {
    render(<KisokAdminConsole />);

    fireEvent.click(screen.getByRole('button', { name: 'Open local access gate' }));
    expect(screen.getByText('Local access gate')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Enter local workspace' }));
    expect(screen.getByText('Operations control')).toBeInTheDocument();
  });

  it('shows the operational summary and switches to the local products feature', () => {
    render(<KisokAdminConsole />);

    expect(screen.getByRole('heading', { name: 'Operations control' })).toBeInTheDocument();
    expect(screen.getByText('135.5 SAR')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Products' }));

    expect(screen.getByRole('heading', { name: 'Product catalog' })).toBeInTheDocument();
    expect(screen.getByText('Arabic Reserve')).toBeInTheDocument();
  });

  it('opens a local product draft buffer without requesting an external service', () => {
    render(<KisokAdminConsole />);

    fireEvent.click(screen.getByRole('button', { name: 'Products' }));
    fireEvent.click(screen.getByRole('button', { name: 'New product' }));

    expect(screen.getByText('Draft product buffer')).toBeInTheDocument();
  });

  it('switches any feature into local loading, empty, and failure states', () => {
    render(<KisokAdminConsole />);

    fireEvent.click(screen.getByRole('button', { name: 'Products' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simulate empty state' }));
    expect(screen.getByText('No local products records')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Simulate failure state' }));
    expect(screen.getByText('Local data unavailable')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Simulate loading state' }));
    expect(screen.getByText('Loading local workspace')).toBeInTheDocument();
  });

  it('renders local catalog, inventory, and order records through feature navigation', () => {
    render(<KisokAdminConsole />);

    fireEvent.click(screen.getByRole('button', { name: 'Catalog' }));
    expect(screen.getByText('Arabica House')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Inventory' }));
    expect(screen.getByText('Manual increase')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Orders' }));
    expect(screen.getAllByText('Customer pickup')).toHaveLength(2);
  });

  it('reports local action buffers for catalog, users, and media', () => {
    render(<KisokAdminConsole />);

    fireEvent.click(screen.getByRole('button', { name: 'Catalog' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add taxonomy node' }));
    expect(screen.getByRole('status')).toHaveTextContent('Taxonomy draft opened');

    fireEvent.click(screen.getByRole('button', { name: 'Users' }));
    fireEvent.click(screen.getByRole('button', { name: 'Invite operator' }));
    expect(screen.getByRole('status')).toHaveTextContent('Operator invite buffer opened');

    fireEvent.click(screen.getByRole('button', { name: 'Media' }));
    fireEvent.click(screen.getByRole('button', { name: 'Upload asset' }));
    expect(screen.getByRole('status')).toHaveTextContent('Asset upload buffer opened');
  });

  it('collects an inventory adjustment reason in an accessible local dialog before staging the action', () => {
    render(<KisokAdminConsole />);

    fireEvent.click(screen.getByRole('button', { name: 'Inventory' }));
    fireEvent.click(screen.getByRole('button', { name: 'Record adjustment' }));

    expect(screen.getByRole('dialog', { name: 'Record stock adjustment' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Adjustment reason'), {
      target: { value: 'Counted reserve bags after morning handoff' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Stage local adjustment' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Inventory adjustment staged locally');
  });

  it('renders local users, media, and store settings through feature navigation', () => {
    render(<KisokAdminConsole />);

    fireEvent.click(screen.getByRole('button', { name: 'Users' }));
    expect(screen.getByText('Mariam Al-Harbi')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Media' }));
    expect(screen.getByText('origin-dark.png')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByText('Low-stock threshold')).toBeInTheDocument();
  });
});
