import { SponsorSurface } from "@/components/sponsor-surface";
import { QueryCard } from "@/components/token-search-form";
import { createMetricsRecorder } from "@/lib/runtime-metrics";

export const revalidate = 3600;

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
    <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8 md:px-10 md:py-12">
      {/* Brand label */}
      <p className="display-copy mb-6 text-sm font-semibold tracking-tight text-[var(--color-ink-soft)]">
        {"\u7231\u8d75\u8d75"}
      </p>

      {/* Primary card — token query */}
      <div className="poster-enter">
        <QueryCard
          mode="token"
          title={"\u8fd9\u4e2a\u4ee3\u5e01\u8c01\u7231\u2764\ufe0f"}
          placeholder={"\u8f93\u5165\u4ee3\u5e01\u5408\u7ea6\u5730\u5740"}
        />
      </div>

      {/* Secondary card — address profile (narrower on larger screens) */}
      <div className="mt-4 w-full reveal-up md:mt-5 md:max-w-[80%] lg:max-w-[67%]">
        <QueryCard
          mode="address"
          title={"\u8fd9\u4e2a\u5730\u5740\u753b\u50cf\u2b50"}
          placeholder={"\u8f93\u5165\u94b1\u5305\u5730\u5740"}
        />
      </div>

      {/* Sponsor chips — visually recessed */}
      <SponsorSurface aveTotalCount={aveTotalCount} />
    </main>
  );
}
