'use client';

const settings = [
  ['Store identity', 'Kisok Central'],
  ['Timezone', 'Asia/Dubai'],
  ['Low-stock threshold', '05 units'],
  ['Order reset', 'Automatic after completion'],
];

export function StoreSettingsPanel() {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.18fr_0.82fr]">
      <div className="border border-[#292929] bg-[#181818] p-5 sm:p-7">
        <p className="font-mono text-[#969694] text-[10px] uppercase tracking-[0.2em]">
          Store settings / local workspace
        </p>
        <h1 className="mt-2 font-black text-5xl text-[#f0f0ed] tracking-[-0.08em] sm:text-6xl">
          Store defaults
        </h1>
        <div className="mt-8 divide-y divide-[#303030] border-[#303030] border-y">
          {settings.map(([label, value]) => (
            <div
              className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
              key={label}
            >
              <span className="text-[#a0a09d] text-sm">{label}</span>
              <span className="font-mono text-[#ecece8] text-xs uppercase tracking-[0.12em]">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex min-h-72 flex-col justify-between bg-[#e6e6e2] p-6 text-[#141414] sm:p-8">
        <p className="font-mono text-[#595958] text-[10px] uppercase tracking-[0.2em]">
          Connection status
        </p>
        <div>
          <p className="font-black text-5xl tracking-[-0.08em]">LOCAL</p>
          <p className="mt-3 max-w-xs text-[#4e4e4c] text-sm leading-6">
            The settings layout is ready. Store configuration will persist once the integration
            phase starts.
          </p>
        </div>
      </div>
    </section>
  );
}
