import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({ search: vi.fn() }));

vi.mock('../repositories', () => ({
  adminUsersRepository: { search: testContext.search },
}));

import { AdminUsersPanel } from './AdminUsersPanel';

describe('AdminUsersPanel', () => {
  it('renders hosted profile identity and role data instead of local fixtures', async () => {
    testContext.search.mockResolvedValue([
      {
        id: 'profile-1',
        displayName: 'Amina Admin',
        email: 'amina@example.test',
        role: 'admin',
        isActive: true,
        createdAt: '2026-08-26T00:00:00Z',
        totalCount: 1,
      },
    ]);

    render(<AdminUsersPanel />);

    expect(await screen.findByText('Amina Admin')).toBeInTheDocument();
    expect(screen.getByText('amina@example.test')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(screen.queryByText(/local workspace/i)).not.toBeInTheDocument();
  });
});
