'use client';

export function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="border border-[#454545] px-2 py-1 font-mono text-[#c7c7c7] text-[10px] uppercase tracking-[0.16em]">
      {children}
    </span>
  );
}
