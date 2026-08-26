'use client';

export function LocalAccessGate({ onEnter }: { onEnter: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#101010] p-5 text-[#f1f1ef] sm:p-8">
      <section className="grid w-full max-w-5xl gap-px border border-[#2d2d2d] bg-[#2d2d2d] lg:grid-cols-[1.15fr_0.85fr]">
        <div className="bg-[#181818] p-7 sm:p-10">
          <p className="font-mono text-[#969694] text-[10px] uppercase tracking-[0.24em]">
            Kisok / administrative workspace
          </p>
          <h1 className="mt-12 max-w-xl font-black text-6xl text-[#f0f0ed] leading-[0.84] tracking-[-0.09em] sm:text-8xl">
            Local access gate
          </h1>
          <p className="mt-8 max-w-lg text-[#a6a6a2] text-sm leading-7">
            This is a local UI checkpoint for reviewing the dashboard. It does not identify a user,
            create a session, or enforce permissions.
          </p>
        </div>
        <div className="flex min-h-80 flex-col justify-between bg-[#e7e7e4] p-7 text-[#141414] sm:p-10">
          <p className="font-mono text-[#575756] text-[10px] uppercase tracking-[0.2em]">
            Authentication status
          </p>
          <div>
            <p className="font-black text-5xl tracking-[-0.08em]">LOCAL</p>
            <p className="mt-3 max-w-sm text-[#4f4f4d] text-sm leading-6">
              Supabase Auth and role enforcement are deliberately deferred to the integration phase.
            </p>
          </div>
          <button
            className="border border-[#151515] px-4 py-3 text-left font-bold text-xs uppercase tracking-[0.14em] transition-colors hover:bg-[#151515] hover:text-[#e7e7e4]"
            onClick={onEnter}
            type="button"
          >
            Enter local workspace
          </button>
        </div>
      </section>
    </main>
  );
}
