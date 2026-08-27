import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({ signOut: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));

vi.mock('@/infrastructure/supabase/auth/browser', () => ({
  signOutCurrentUser: testContext.signOut,
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/en/admin',
  useRouter: () => ({ replace: testContext.replace, refresh: testContext.refresh }),
}));

import { AdminShell } from './AdminShell';

describe('AdminShell', () => {
  it('keeps the session in place and explains a failed sign-out action', async () => {
    const user = userEvent.setup();
    testContext.signOut.mockRejectedValue(new Error('Network request failed'));

    render(
      <AdminShell displayName="Admin" locale="en">
        <p>Workspace</p>
      </AdminShell>,
    );
    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be completed/i);
    expect(testContext.replace).not.toHaveBeenCalled();
  });

  it('renders order notification sound toggle in the admin header', () => {
    render(
      <AdminShell displayName="Admin" locale="en">
        <p>Workspace Content</p>
      </AdminShell>,
    );

    expect(screen.getByRole('button', { name: /notification sound/i })).toBeInTheDocument();
  });

  it('does not claim a live connection status in the sidebar', () => {
    render(
      <AdminShell displayName="Admin" locale="en">
        <p>Workspace</p>
      </AdminShell>,
    );

    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
    expect(screen.getByText('Supabase-backed')).toBeInTheDocument();
  });
});
