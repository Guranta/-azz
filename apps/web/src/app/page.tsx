import { SponsorSurface } from "@/components/sponsor-surface";
import { TokenSearchForm } from "@/components/token-search-form";
import { createMetricsRecorder } from "@/lib/runtime-metrics";

function getAveMetricsSnapshot() {
  try {
    const recorder = createMetricsRecorder();
    return recorder.getSnapshot();
  } catch {
    return null;
  }
}

export default function Home() {
  const aveTotalCount = getAveMetricsSnapshot()?.totalCount ?? 0;

  return (
    <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-6 md:px-10 md:py-8">
      <header className="mb-8 rounded-[24px] border border-white/10 bg-[rgba(7,14,25,0.72)] px-5 py-4 backdrop-blur md:px-6">
        <p className="display-copy text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
          {"\u7231\u8d75\u8d75"}
        </p>
      </header>

      <section className="surface-card-strong poster-enter relative overflow-hidden px-6 py-10 md:px-10 md:py-14">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute left-[-8%] top-[-20%] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(244,199,106,0.28)_0%,transparent_70%)] blur-3xl" />
        <div className="pointer-events-none absolute right-[-8%] bottom-[-24%] h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(122,215,255,0.24)_0%,transparent_70%)] blur-3xl" />

        <div className="relative">
          <h1 className="poster-title max-w-5xl font-semibold text-[var(--color-ink)]">
            {"\u8fd9\u4e2ameme\u5e01\u6709\u8c01\u7231\u2764\ufe0f"}
          </h1>

          <div className="mt-8 max-w-3xl">
            <TokenSearchForm />
          </div>
        </div>
      </section>

      <SponsorSurface aveTotalCount={aveTotalCount} />
    </main>
  );
}
