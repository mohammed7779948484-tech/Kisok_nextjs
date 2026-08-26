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

  it('keeps local loading, empty, and failure states consistent across every workspace', () => {
    render(<KisokAdminConsole />);

    const workspaces = [
      ['Overview', 'overview'],
      ['Products', 'products'],
      ['Catalog', 'catalog'],
      ['Inventory', 'inventory'],
      ['Orders', 'orders'],
      ['Users', 'users'],
      ['Media', 'media'],
      ['Settings', 'settings'],
    ] as const;

    for (const [label, localName] of workspaces) {
      fireEvent.click(screen.getByRole('button', { name: label }));
      fireEvent.click(screen.getByRole('button', { name: 'Simulate empty state' }));
      expect(screen.getByText(`No local ${localName} records`)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Simulate failure state' }));
      expect(screen.getByText('Local data unavailable')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Simulate loading state' }));
      expect(screen.getByText('Loading local workspace')).toBeInTheDocument();
    }
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

  it('warns about local asset usage before staging a media removal', () => {
    render(<KisokAdminConsole />);

    fireEvent.click(screen.getByRole('button', { name: 'Media' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review removal for origin-dark.png' }));

    expect(screen.getByRole('dialog', { name: 'Review asset removal' })).toHaveTextContent(
      'origin-dark.png',
    );
    expect(screen.getByText('Usage check required')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Keep asset' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('collects a cancellation reason before staging a local order cancellation', () => {
    render(<KisokAdminConsole />);

    fireEvent.click(screen.getByRole('button', { name: 'Orders' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review cancellation for #K-1048' }));

    expect(screen.getByRole('dialog', { name: 'Cancel local order' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Cancellation reason'), {
      target: { value: 'Pickup guest did not arrive' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Stage local cancellation' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Cancellation staged for #K-1048');
  });

  it('collects a handoff note before staging a local order fulfillment', () => {
    render(<KisokAdminConsole />);

    fireEvent.click(screen.getByRole('button', { name: 'Orders' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review handoff for #K-1050' }));

    expect(screen.getByRole('dialog', { name: 'Confirm local handoff' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Handoff note'), {
      target: { value: 'Order handed to the walk-in counter' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Stage local handoff' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Handoff staged for #K-1050');
  });

  it('edits the local store identity through a confirmed settings dialog', () => {
    render(<KisokAdminConsole />);

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit local settings' }));

    expect(screen.getByRole('dialog', { name: 'Edit store settings' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Store identity'), {
      target: { value: 'Kisok Harbour' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save local settings' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Kisok Harbour')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Local store settings saved');
  });

  it('edits local operational settings through the same confirmed dialog', () => {
    render(<KisokAdminConsole />);

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit local settings' }));

    fireEvent.change(screen.getByLabelText('Low-stock threshold'), {
      target: { value: '08 units' },
    });
    fireEvent.change(screen.getByLabelText('Order reset'), {
      target: { value: 'Manual approval after completion' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save local settings' }));

    expect(screen.getByText('08 units')).toBeInTheDocument();
    expect(screen.getByText('Manual approval after completion')).toBeInTheDocument();
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
