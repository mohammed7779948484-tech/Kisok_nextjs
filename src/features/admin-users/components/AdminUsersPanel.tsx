'use client';

import { KisokButton, StatusPill } from '@/shared/ui';

import { adminUsersRepository } from '../repositories';

export function AdminUsersPanel({
  onAction = () => undefined,
}: {
  onAction?: (message: string) => void;
}) {
  const localUsers = adminUsersRepository.list();

  return (
    <section className="border border-[#292929] bg-[#181818] p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-[#303030] border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[#969694] text-[10px] uppercase tracking-[0.2em]">
            Access control / local workspace
          </p>
          <h1 className="mt-2 font-black text-5xl text-[#f0f0ed] tracking-[-0.08em] sm:text-6xl">
            Team access
          </h1>
        </div>
        <KisokButton onClick={() => onAction('Operator invite buffer opened')} variant="outline">
          Invite operator
        </KisokButton>
      </div>
      <div className="mt-6 divide-y divide-[#303030] border-[#303030] border-y">
        {localUsers.map((user, index) => (
          <article
            className="grid gap-4 py-5 sm:grid-cols-[auto_1fr_0.7fr_auto] sm:items-center"
            key={user.name}
          >
            <div
              className={`flex size-10 items-center justify-center font-black text-sm ${index === 0 ? 'bg-[#e6e6e2] text-[#111]' : 'bg-[#343434] text-[#efefec]'}`}
            >
              {user.name
                .split(' ')
                .map((part) => part[0])
                .join('')}
            </div>
            <p className="font-bold text-[#eeeeeb]">{user.name}</p>
            <p className="font-mono text-[#989895] text-[10px] uppercase tracking-[0.16em]">
              {user.access}
            </p>
            <StatusPill>{user.state}</StatusPill>
          </article>
        ))}
      </div>
    </section>
  );
}
