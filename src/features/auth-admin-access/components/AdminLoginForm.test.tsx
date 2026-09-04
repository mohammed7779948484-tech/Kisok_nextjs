import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => ({
  signInAdmin: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('@/infrastructure/supabase/auth/browser', () => ({ signInAdmin: testContext.signInAdmin }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: testContext.replace, refresh: testContext.refresh }),
}));

import { AdminLoginForm } from './AdminLoginForm';

describe('AdminLoginForm', () => {
  it('distinguishes a service/network failure from invalid credentials', async () => {
    const user = userEvent.setup();
    testContext.signInAdmin.mockResolvedValue({ ok: false, reason: 'network' });

    render(<AdminLoginForm nextPath="/en/admin/products" />);
    await user.type(screen.getByLabelText('Email'), 'Admin@gmail.com');
    await user.type(screen.getByLabelText('Password'), 'test-password');
    await user.click(screen.getByRole('button', { name: 'Sign in to Admin' }));

    expect(await screen.findByText(/service could not be reached/i)).toBeInTheDocument();
    expect(screen.queryByText(/email or password is not valid/i)).not.toBeInTheDocument();
  });
});
