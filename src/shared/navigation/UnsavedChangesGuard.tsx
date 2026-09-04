'use client';

import type { ComponentProps, MouseEvent, ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useRef } from 'react';

import NextLink from 'next/link';

type UnsavedChangesGuardApi = {
  /** Registers (or clears, with `null`) the confirmation message a dirty
   * editor wants shown before any guarded in-app navigation proceeds. Later
   * calls overwrite earlier ones — there is one guard slot, matching the
   * app having one editor open at a time. */
  setBlockedMessage: (message: string | null) => void;
  /** Shows the registered confirmation (if any) and returns whether
   * navigation may proceed. Clears the registered message on confirm so a
   * second guarded link in the same click sequence doesn't re-prompt. */
  confirmLeave: () => boolean;
};

// Outside a Provider (most non-navigation focused tests, any future mount
// point that doesn't need the guard) every call is a safe no-op: the
// message is dropped and confirmLeave always allows navigation — the same
// behavior as before this guard existed.
const noopGuardApi: UnsavedChangesGuardApi = {
  confirmLeave: () => true,
  setBlockedMessage: () => {
    // Intentionally a no-op outside a Provider — see comment above.
  },
};

const UnsavedChangesGuardContext = createContext<UnsavedChangesGuardApi>(noopGuardApi);

export function UnsavedChangesGuardProvider({ children }: { children: ReactNode }) {
  const messageRef = useRef<string | null>(null);

  const setBlockedMessage = useCallback((message: string | null) => {
    messageRef.current = message;
  }, []);

  const confirmLeave = useCallback(() => {
    if (!messageRef.current) return true;
    const confirmed = window.confirm(messageRef.current);
    if (confirmed) messageRef.current = null;
    return confirmed;
  }, []);

  const api = useRef<UnsavedChangesGuardApi>({ confirmLeave, setBlockedMessage }).current;

  return (
    <UnsavedChangesGuardContext.Provider value={api}>
      {children}
    </UnsavedChangesGuardContext.Provider>
  );
}

function useUnsavedChangesGuardApi(): UnsavedChangesGuardApi {
  return useContext(UnsavedChangesGuardContext);
}

/**
 * Registers `message` as the confirmation to show before any guarded
 * in-app navigation (sidebar links, header links, …) proceeds while this
 * hook is mounted with a non-null message — e.g. a dirty Product editor.
 * Pass `null` once the form is clean/saved to lift the guard. Automatically
 * clears on unmount so navigating away through an un-guarded path (a
 * confirmed guarded link, a router.push the editor itself performs) never
 * leaves a stale block behind for the next page.
 */
export function useUnsavedChangesGuard(message: string | null) {
  const { setBlockedMessage } = useUnsavedChangesGuardApi();
  useEffect(() => {
    setBlockedMessage(message);
    return () => setBlockedMessage(null);
  }, [message, setBlockedMessage]);
}

/** Escape hatch for call sites that navigate imperatively (`router.push`) or
 * wrap a different `Link` implementation (e.g. next-intl's locale-aware
 * `Link`) instead of the plain `next/link` one `GuardedLink` below wraps. */
export function useConfirmLeave(): () => boolean {
  return useUnsavedChangesGuardApi().confirmLeave;
}

/**
 * Drop-in replacement for `next/link`'s `Link`. If a Product editor (or any
 * other guarded form) has registered an unsaved-changes message, clicking
 * this link confirms first — Cancel keeps the current page and values
 * intact, Confirm proceeds with the navigation and clears the guard.
 */
export function GuardedLink({ onClick, ...props }: ComponentProps<typeof NextLink>) {
  const confirmLeave = useConfirmLeave();
  return (
    <NextLink
      {...props}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        if (!confirmLeave()) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    />
  );
}
