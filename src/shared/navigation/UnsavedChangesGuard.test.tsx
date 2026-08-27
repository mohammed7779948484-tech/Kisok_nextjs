import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    onClick,
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

import {
  GuardedLink,
  UnsavedChangesGuardProvider,
  useConfirmLeave,
  useUnsavedChangesGuard,
} from './UnsavedChangesGuard';

function DirtyEditor({ message }: { message: string | null }) {
  useUnsavedChangesGuard(message);
  return null;
}

function Harness({ message }: { message: string | null }) {
  return (
    <UnsavedChangesGuardProvider>
      <DirtyEditor message={message} />
      <GuardedLink href="/admin/orders">Orders</GuardedLink>
    </UnsavedChangesGuardProvider>
  );
}

describe('UnsavedChangesGuard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('navigates without prompting when no guard message is registered', () => {
    render(<Harness message={null} />);
    const confirmSpy = vi.spyOn(window, 'confirm');

    const link = screen.getByRole('link', { name: 'Orders' });
    const event = fireEvent.click(link);

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(event).toBe(true); // not prevented
  });

  it('blocks navigation when the confirmation is declined', () => {
    render(<Harness message="Discard unsaved Product changes?" />);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const link = screen.getByRole('link', { name: 'Orders' });
    const event = fireEvent.click(link);

    expect(window.confirm).toHaveBeenCalledWith('Discard unsaved Product changes?');
    expect(event).toBe(false); // preventDefault called
  });

  it('allows navigation once the confirmation is accepted', () => {
    render(<Harness message="Discard unsaved Product changes?" />);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const link = screen.getByRole('link', { name: 'Orders' });
    const event = fireEvent.click(link);

    expect(event).toBe(true);
  });

  it('clears the guard once the registering component unmounts', () => {
    const { rerender } = render(<Harness message="Discard unsaved Product changes?" />);
    rerender(
      <UnsavedChangesGuardProvider>
        <GuardedLink href="/admin/orders">Orders</GuardedLink>
      </UnsavedChangesGuardProvider>,
    );
    const confirmSpy = vi.spyOn(window, 'confirm');

    const link = screen.getByRole('link', { name: 'Orders' });
    const event = fireEvent.click(link);

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(event).toBe(true);
  });

  it('exposes useConfirmLeave for call sites using a different Link implementation', () => {
    function OtherLink() {
      const confirmLeave = useConfirmLeave();
      return (
        <button onClick={() => confirmLeave()} type="button">
          Leave
        </button>
      );
    }
    render(
      <UnsavedChangesGuardProvider>
        <DirtyEditor message="Discard unsaved Product changes?" />
        <OtherLink />
      </UnsavedChangesGuardProvider>,
    );
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    screen.getByRole('button', { name: 'Leave' }).click();

    expect(confirmSpy).toHaveBeenCalledWith('Discard unsaved Product changes?');
  });
});
