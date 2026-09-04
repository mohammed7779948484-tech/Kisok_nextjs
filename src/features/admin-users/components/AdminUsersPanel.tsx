'use client';

import { type FormEvent, useCallback, useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Database } from '@/infrastructure/supabase/database.types';
import {
  KisokButton,
  KisokDialog,
  KisokDialogContent,
  KisokDialogDescription,
  KisokDialogFooter,
  KisokDialogHeader,
  KisokDialogTitle,
  KisokInput,
  StatusPill,
} from '@/shared/ui';

import { adminUsersRepository } from '../repositories';
import {
  type AdminUserCreateFormValues,
  type AdminUserEditFormValues,
  adminUserCreateFormDefaultValues,
  adminUserCreateFormSchema,
  adminUserEditFormSchema,
} from '../schemas/admin-user.schema';
import { createAdminUser, resetAdminUserPassword, updateAdminUser } from '../server/actions';
import type { AdminUserRecord } from '../types';

type AppRole = Database['public']['Enums']['app_role'];

const PAGE_SIZE = 20;
const ROLE_OPTIONS: Array<{ value: AppRole; label: string }> = [
  { value: 'admin', label: 'Administrator' },
  { value: 'preparation', label: 'Preparation' },
  { value: 'customer', label: 'Customer' },
];

function roleLabel(role: AppRole) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Debounced-as-you-type search: one deliberate pattern, not a live-effect
 * search plus a redundant "Search" button. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

type EditDialogState = { open: boolean; user: AdminUserRecord | null };

function EditAdminUserDialog({
  dialogState,
  onOpenChange,
  onSaved,
}: {
  dialogState: EditDialogState;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const { open, user } = dialogState;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdminUserEditFormValues>({
    resolver: zodResolver(adminUserEditFormSchema),
    defaultValues: { displayName: '', role: 'preparation' },
  });

  useEffect(() => {
    if (!(open && user)) return;
    reset({ displayName: user.displayName, role: user.role });
    setError(null);
  }, [open, user, reset]);

  async function onSubmit(values: AdminUserEditFormValues) {
    if (!user) return;

    setSubmitting(true);
    setError(null);
    try {
      await updateAdminUser({
        targetId: user.id,
        changes: { display_name: values.displayName, role: values.role },
      });
      await onSaved();
      onOpenChange(false);
    } catch (caught) {
      setError(errorMessage(caught, 'This profile could not be updated.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KisokDialog onOpenChange={onOpenChange} open={open}>
      <KisokDialogContent>
        <KisokDialogHeader>
          <KisokDialogTitle>Edit team member</KisokDialogTitle>
          <KisokDialogDescription>
            Update the display name and role for this hosted profile.
          </KisokDialogDescription>
        </KisokDialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <Label htmlFor="admin-user-edit-name">Display name</Label>
            <KisokInput
              aria-invalid={Boolean(errors.displayName)}
              id="admin-user-edit-name"
              {...register('displayName')}
            />
            {errors.displayName ? (
              <p className="text-destructive text-sm">{errors.displayName.message}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="admin-user-edit-role">Role</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-full" id="admin-user-edit-role">
                    <SelectValue>{(value: AppRole) => roleLabel(value)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <KisokDialogFooter>
            <KisokButton
              disabled={submitting}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="quiet"
            >
              Cancel
            </KisokButton>
            <KisokButton disabled={submitting} type="submit">
              {submitting ? 'Saving…' : 'Save changes'}
            </KisokButton>
          </KisokDialogFooter>
        </form>
      </KisokDialogContent>
    </KisokDialog>
  );
}

function CreateAdminUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void | Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdminUserCreateFormValues>({
    resolver: zodResolver(adminUserCreateFormSchema),
    defaultValues: adminUserCreateFormDefaultValues,
  });

  useEffect(() => {
    if (open) return;
    reset(adminUserCreateFormDefaultValues);
    setError(null);
  }, [open, reset]);

  async function onSubmit(values: AdminUserCreateFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      await createAdminUser(values);
      await onCreated();
      onOpenChange(false);
    } catch (caught) {
      setError(errorMessage(caught, 'This team member could not be created.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KisokDialog onOpenChange={onOpenChange} open={open}>
      <KisokDialogContent>
        <KisokDialogHeader>
          <KisokDialogTitle>Create team member</KisokDialogTitle>
          <KisokDialogDescription>
            Creates a confirmed Auth account and its Lean profile directly — no invite email is
            sent.
          </KisokDialogDescription>
        </KisokDialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <Label htmlFor="admin-user-create-name">Display name</Label>
            <KisokInput
              aria-invalid={Boolean(errors.displayName)}
              id="admin-user-create-name"
              {...register('displayName')}
            />
            {errors.displayName ? (
              <p className="text-destructive text-sm">{errors.displayName.message}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="admin-user-create-email">Email</Label>
            <KisokInput
              aria-invalid={Boolean(errors.email)}
              id="admin-user-create-email"
              type="text"
              {...register('email')}
            />
            {errors.email ? (
              <p className="text-destructive text-sm">{errors.email.message}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="admin-user-create-password">Initial password</Label>
            <KisokInput
              aria-invalid={Boolean(errors.password)}
              id="admin-user-create-password"
              type="password"
              {...register('password')}
            />
            {errors.password ? (
              <p className="text-destructive text-sm">{errors.password.message}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="admin-user-create-role">Role</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-full" id="admin-user-create-role">
                    <SelectValue>{(value: AppRole) => roleLabel(value)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <KisokDialogFooter>
            <KisokButton
              disabled={submitting}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="quiet"
            >
              Cancel
            </KisokButton>
            <KisokButton disabled={submitting} type="submit">
              {submitting ? 'Creating…' : 'Create team member'}
            </KisokButton>
          </KisokDialogFooter>
        </form>
      </KisokDialogContent>
    </KisokDialog>
  );
}

type PasswordDialogState = { open: boolean; user: AdminUserRecord | null };

function ResetPasswordDialog({
  dialogState,
  onOpenChange,
}: {
  dialogState: PasswordDialogState;
  onOpenChange: (open: boolean) => void;
}) {
  const { open, user } = dialogState;
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) return;
    setPassword('');
    setError(null);
    setSuccess(false);
  }, [open]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError(null);
    try {
      await resetAdminUserPassword({ targetId: user.id, password });
      setSuccess(true);
    } catch (caught) {
      setError(errorMessage(caught, 'The password could not be reset.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KisokDialog onOpenChange={onOpenChange} open={open}>
      <KisokDialogContent>
        <KisokDialogHeader>
          <KisokDialogTitle>Reset password</KisokDialogTitle>
          <KisokDialogDescription>
            {user ? `Set a new password for ${user.displayName}.` : null} This takes effect
            immediately.
          </KisokDialogDescription>
        </KisokDialogHeader>
        {success ? (
          <div className="grid gap-4">
            <p className="text-sm">Password updated.</p>
            <KisokDialogFooter>
              <KisokButton onClick={() => onOpenChange(false)} type="button">
                Done
              </KisokButton>
            </KisokDialogFooter>
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="admin-user-reset-password">New password</Label>
              <KisokInput
                id="admin-user-reset-password"
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
            <KisokDialogFooter>
              <KisokButton
                disabled={submitting}
                onClick={() => onOpenChange(false)}
                type="button"
                variant="quiet"
              >
                Cancel
              </KisokButton>
              <KisokButton disabled={submitting} type="submit">
                {submitting ? 'Saving…' : 'Save new password'}
              </KisokButton>
            </KisokDialogFooter>
          </form>
        )}
      </KisokDialogContent>
    </KisokDialog>
  );
}

export function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditDialogState>({ open: false, user: null });
  const [passwordState, setPasswordState] = useState<PasswordDialogState>({
    open: false,
    user: null,
  });
  const [createOpen, setCreateOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await adminUsersRepository.search(
        debouncedSearch,
        PAGE_SIZE,
        (page - 1) * PAGE_SIZE,
      );
      setUsers(results);
      setTotalCount(results[0]?.totalCount ?? 0);
    } catch {
      setError('Team access records could not be loaded. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  async function toggleActive(user: AdminUserRecord) {
    setUpdatingId(user.id);
    setError(null);
    try {
      await updateAdminUser({
        targetId: user.id,
        changes: { is_active: !user.isActive },
      });
      await refresh();
    } catch (caught) {
      setError(errorMessage(caught, `The profile for ${user.displayName} could not be updated.`));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card/90 p-4 text-card-foreground shadow-panel sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.2em]">
            Access control / hosted data
          </p>
          <h1 className="mt-2 text-balance font-black text-4xl tracking-[-0.05em] sm:text-5xl">
            Team access
          </h1>
        </div>
        <div className="flex gap-2">
          <KisokButton onClick={() => setCreateOpen(true)}>Add team member</KisokButton>
          <KisokButton onClick={() => void refresh()} variant="outline">
            Refresh
          </KisokButton>
        </div>
      </div>

      <div className="mt-6 max-w-lg">
        <Label className="sr-only" htmlFor="admin-user-search">
          Search team
        </Label>
        <KisokInput
          id="admin-user-search"
          onChange={(event) => {
            setSearchInput(event.target.value);
            setPage(1);
          }}
          placeholder="Search name or email"
          value={searchInput}
        />
      </div>

      {loading ? (
        <p className="mt-6 text-muted-foreground text-sm" role="status">
          Loading team access…
        </p>
      ) : error ? (
        <div className="mt-6 grid gap-3" role="alert">
          <p className="text-destructive text-sm">{error}</p>
          <KisokButton onClick={() => void refresh()} variant="outline">
            Try again
          </KisokButton>
        </div>
      ) : users.length === 0 ? (
        <p className="mt-6 text-muted-foreground text-sm">No team records match this search.</p>
      ) : (
        <div className="mt-6 divide-y divide-border border-border border-y">
          {users.map((user) => (
            <article
              className="grid gap-3 py-5 transition-colors hover:bg-accent/20 sm:grid-cols-[auto_1fr_0.7fr_auto] sm:items-center sm:px-3"
              key={user.id}
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 font-black text-primary text-sm">
                {user.displayName
                  .split(' ')
                  .map((part) => part[0])
                  .join('')}
              </div>
              <div>
                <p className="font-bold">{user.displayName}</p>
                <p className="text-muted-foreground text-sm">{user.email}</p>
              </div>
              <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
                {roleLabel(user.role)}
              </p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <StatusPill tone={user.isActive ? 'success' : 'destructive'}>
                  {user.isActive ? 'Active' : 'Paused'}
                </StatusPill>
                <KisokButton
                  onClick={() => setEditState({ open: true, user })}
                  size="sm"
                  variant="quiet"
                >
                  Edit
                </KisokButton>
                <KisokButton
                  onClick={() => setPasswordState({ open: true, user })}
                  size="sm"
                  variant="quiet"
                >
                  Reset password
                </KisokButton>
                <KisokButton
                  aria-label={`${user.isActive ? 'Deactivate' : 'Activate'} ${user.displayName}`}
                  disabled={updatingId === user.id}
                  onClick={() => void toggleActive(user)}
                  size="sm"
                  variant="quiet"
                >
                  {updatingId === user.id ? 'Saving…' : user.isActive ? 'Deactivate' : 'Activate'}
                </KisokButton>
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <Pagination className="mt-6 justify-start">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <PaginationItem key={pageNumber}>
                <PaginationLink isActive={pageNumber === page} onClick={() => setPage(pageNumber)}>
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                aria-disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}

      <EditAdminUserDialog
        dialogState={editState}
        onOpenChange={(open) => setEditState((current) => ({ ...current, open }))}
        onSaved={refresh}
      />
      <CreateAdminUserDialog onCreated={refresh} onOpenChange={setCreateOpen} open={createOpen} />
      <ResetPasswordDialog
        dialogState={passwordState}
        onOpenChange={(open) => setPasswordState((current) => ({ ...current, open }))}
      />
    </section>
  );
}
