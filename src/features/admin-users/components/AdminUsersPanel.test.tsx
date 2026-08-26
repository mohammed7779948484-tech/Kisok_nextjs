import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  search: vi.fn(),
  updateAdminUser: vi.fn(),
  createAdminUser: vi.fn(),
  resetAdminUserPassword: vi.fn(),
}));

vi.mock('../repositories', () => ({
  adminUsersRepository: { search: testContext.search },
}));

vi.mock('../server/actions', () => ({
  updateAdminUser: testContext.updateAdminUser,
  createAdminUser: testContext.createAdminUser,
  resetAdminUserPassword: testContext.resetAdminUserPassword,
}));

import { AdminUsersPanel } from './AdminUsersPanel';

afterEach(() => {
  vi.clearAllMocks();
});

beforeAll(() => {
  if (!('ResizeObserver' in globalThis)) {
    // jsdom has no ResizeObserver; the Select popup's floating-ui
    // positioning needs one to observe the trigger/popup elements.
    globalThis.ResizeObserver = class {
      observe() {
        // no-op: jsdom has no layout, so there is nothing to observe.
      }
      unobserve() {
        // no-op
      }
      disconnect() {
        // no-op
      }
    };
  }
});

const adminUser = {
  id: 'profile-1',
  displayName: 'Amina Admin',
  email: 'amina@example.test',
  role: 'admin' as const,
  isActive: true,
  createdAt: '2026-08-26T00:00:00Z',
  totalCount: 1,
};

const prepUser = {
  id: 'profile-2',
  displayName: 'Prep User',
  email: 'prep@example.test',
  role: 'preparation' as const,
  isActive: true,
  createdAt: '2026-08-26T00:00:00Z',
  totalCount: 1,
};

describe('AdminUsersPanel', () => {
  it('renders hosted profile identity and role data instead of local fixtures', async () => {
    testContext.search.mockResolvedValue([adminUser]);

    render(<AdminUsersPanel />);

    expect(await screen.findByText('Amina Admin')).toBeInTheDocument();
    expect(screen.getByText('amina@example.test')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(screen.queryByText(/local workspace/i)).not.toBeInTheDocument();
  });

  it('deactivates a hosted profile through the server-only action', async () => {
    const user = userEvent.setup();
    testContext.search.mockResolvedValue([prepUser]);
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

  it('debounces search input into a single trailing request instead of one per keystroke', async () => {
    const user = userEvent.setup();
    testContext.search.mockResolvedValue([]);

    render(<AdminUsersPanel />);
    await waitFor(() => expect(testContext.search).toHaveBeenCalledTimes(1));

    await user.type(screen.getByPlaceholderText('Search name or email'), 'ami');

    await waitFor(
      () => {
        expect(testContext.search).toHaveBeenCalledTimes(2);
        expect(testContext.search).toHaveBeenLastCalledWith('ami', 20, 0);
      },
      { timeout: 2000 },
    );
    expect(screen.queryByRole('button', { name: 'Search' })).not.toBeInTheDocument();
  });

  it('paginates using the total_count returned by the search RPC', async () => {
    const user = userEvent.setup();
    const page1 = Array.from({ length: 20 }, (_, index) => ({
      ...adminUser,
      id: `profile-${index}`,
      displayName: `Person ${index}`,
      totalCount: 45,
    }));
    testContext.search.mockResolvedValueOnce(page1).mockResolvedValueOnce(page1);

    render(<AdminUsersPanel />);
    await screen.findByText('Person 0');

    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Go to next page' }));

    await waitFor(() => expect(testContext.search).toHaveBeenLastCalledWith('', 20, 20));
  });

  it('edits display name and role through the trusted update action', async () => {
    const user = userEvent.setup();
    testContext.search.mockResolvedValue([prepUser]);
    testContext.updateAdminUser.mockResolvedValue({
      id: 'profile-2',
      display_name: 'Renamed Person',
      role: 'admin',
      is_active: true,
      updated_at: '2026-08-26T00:00:00Z',
    });

    render(<AdminUsersPanel />);
    await screen.findByText('Prep User');

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const nameInput = await screen.findByLabelText('Display name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Renamed Person');

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Administrator' }));

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(testContext.updateAdminUser).toHaveBeenCalledWith({
        targetId: 'profile-2',
        changes: { display_name: 'Renamed Person', role: 'admin' },
      }),
    );
  });

  it('surfaces the DB last-active-administrator invariant cleanly instead of crashing', async () => {
    const user = userEvent.setup();
    testContext.search.mockResolvedValue([adminUser]);
    testContext.updateAdminUser.mockRejectedValue(
      new Error('the last active administrator cannot be changed'),
    );

    render(<AdminUsersPanel />);
    await screen.findByText('Amina Admin');

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await screen.findByLabelText('Display name');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByText('the last active administrator cannot be changed'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('creates a team member through the trusted create action', async () => {
    const user = userEvent.setup();
    testContext.search.mockResolvedValue([]);
    testContext.createAdminUser.mockResolvedValue({
      id: 'profile-3',
      displayName: 'New Person',
      email: 'new@example.test',
      role: 'preparation',
      isActive: true,
      createdAt: '2026-08-26T00:00:00Z',
      totalCount: 1,
    });

    render(<AdminUsersPanel />);
    await waitFor(() => expect(testContext.search).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: 'Add team member' }));
    await user.type(await screen.findByLabelText('Display name'), 'New Person');
    await user.type(screen.getByLabelText('Email'), 'new@example.test');
    await user.type(screen.getByLabelText('Initial password'), 'CorrectHorseBattery1!');
    await user.click(screen.getByRole('button', { name: 'Create team member' }));

    await waitFor(() =>
      expect(testContext.createAdminUser).toHaveBeenCalledWith({
        email: 'new@example.test',
        password: 'CorrectHorseBattery1!',
        displayName: 'New Person',
        role: 'preparation',
      }),
    );
  });

  it('resets a password through the trusted password-reset action', async () => {
    const user = userEvent.setup();
    testContext.search.mockResolvedValue([prepUser]);
    testContext.resetAdminUserPassword.mockResolvedValue({ id: 'profile-2' });

    render(<AdminUsersPanel />);
    await screen.findByText('Prep User');

    await user.click(screen.getByRole('button', { name: 'Reset password' }));
    await user.type(await screen.findByLabelText('New password'), 'NewPassword123!');
    await user.click(screen.getByRole('button', { name: 'Save new password' }));

    await waitFor(() =>
      expect(testContext.resetAdminUserPassword).toHaveBeenCalledWith({
        targetId: 'profile-2',
        password: 'NewPassword123!',
      }),
    );
    expect(await screen.findByText('Password updated.')).toBeInTheDocument();
  });
});
