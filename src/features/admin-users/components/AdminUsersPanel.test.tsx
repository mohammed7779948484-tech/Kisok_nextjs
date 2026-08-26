import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  search: vi.fn(),
  updateAdminUser: vi.fn(),
}));

vi.mock('../repositories', () => ({
  adminUsersRepository: { search: testContext.search },
}));

vi.mock('../server/actions', () => ({
  updateAdminUser: testContext.updateAdminUser,
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

  it('deactivates a hosted profile through the server-only action', async () => {
    const user = userEvent.setup();
    testContext.search.mockResolvedValue([
      {
        id: 'profile-2',
        displayName: 'Prep User',
        email: 'prep@example.test',
        role: 'preparation',
        isActive: true,
        createdAt: '2026-08-26T00:00:00Z',
        totalCount: 1,
      },
    ]);
    testContext.updateAdminUser.mockResolvedValue({
      id: 'profile-2',
      display_name: 'Prep User',
      role: 'preparation',
      is_active: false,
      updated_at: '2026-08-26T00:00:00Z',
    });

    render(<AdminUsersPanel />);
    await screen.findByText('Prep User');
    await user.click(screen.getByRole('button', { name: 'Deactivate Prep User' }));

    await waitFor(() =>
      expect(testContext.updateAdminUser).toHaveBeenCalledWith({
        targetId: 'profile-2',
        changes: { is_active: false },
      }),
    );
  });
});
