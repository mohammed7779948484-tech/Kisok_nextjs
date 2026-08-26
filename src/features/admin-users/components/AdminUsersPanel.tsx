'use client';

import { useCallback, useEffect, useState } from 'react';

import { KisokButton, KisokInput, StatusPill } from '@/shared/ui';

import { adminUsersRepository } from '../repositories';
import type { AdminUserRecord } from '../types';

function roleLabel(role: AdminUserRecord['role']) {
  return role === 'admin' ? 'Administrator' : role === 'preparation' ? 'Preparation' : 'Customer';
}

export function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await adminUsersRepository.search(searchTerm));
    } catch {
      setError('Team access records could not be loaded. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section className="border border-border bg-card p-5 text-card-foreground sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.2em]">
            Access control / hosted data
          </p>
          <h1 className="mt-2 font-black text-5xl tracking-[-0.08em] sm:text-6xl">Team access</h1>
        </div>
        <KisokButton onClick={() => void refresh()} variant="outline">
          Refresh
        </KisokButton>
      </div>

      <div className="mt-6 flex gap-3">
        <label className="sr-only" htmlFor="admin-user-search">
          Search team
        </label>
        <KisokInput
          id="admin-user-search"
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search name or email"
          value={searchTerm}
        />
        <KisokButton onClick={() => void refresh()} variant="outline">
          Search
        </KisokButton>
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
              className="grid gap-3 py-5 sm:grid-cols-[auto_1fr_0.7fr_auto] sm:items-center"
              key={user.id}
            >
              <div className="flex size-10 items-center justify-center bg-muted font-black text-sm">
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
              <StatusPill
                className={user.isActive ? undefined : 'border-destructive text-destructive'}
              >
                {user.isActive ? 'Active' : 'Paused'}
              </StatusPill>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
