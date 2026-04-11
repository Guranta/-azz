export default function TokenLoading() {
  return (
    <main className="relative mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-12 md:px-10">
      <section className="loading-surface relative w-full overflow-hidden rounded-[36px] border border-white/12 bg-[linear-gradient(135deg,rgba(14,27,47,0.96)_0%,rgba(7,13,24,0.92)_52%,rgba(10,23,40,0.88)_100%)] px-6 py-16 shadow-[0_42px_140px_rgba(1,5,16,0.56)] backdrop-blur-[18px] md:px-10 md:py-20">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute left-[20%] top-[-10%] h-40 w-40 animate-[driftGlow_6s_ease-in-out_infinite_alternate] rounded-full bg-[radial-gradient(circle,rgba(244,199,106,0.18)_0%,transparent_70%)] blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-8%] right-[18%] h-36 w-36 animate-[driftGlow_8s_ease-in-out_infinite_alternate-reverse] rounded-full bg-[radial-gradient(circle,rgba(122,215,255,0.14)_0%,transparent_70%)] blur-3xl" />

        <div className="relative mx-auto max-w-sm text-center">
          {/* Active spinner ring */}
          <div className="loading-ring mx-auto mb-8 h-16 w-16">
            <div className="loading-ring-track" />
            <div className="loading-ring-fill" />
          </div>

          <h1 className="display-copy text-3xl font-semibold tracking-tight text-[var(--color-ink)] md:text-4xl">
            {"AI\u5206\u6790\u4e2d"}
          </h1>

          <p className="mt-3 text-sm text-[var(--color-ink-soft)]">
            {"\u9884\u8ba1\u9700\u8981 1 \u5206\u949f"}
          </p>

          {/* Decorative skeleton bars */}
          <div className="mt-8 space-y-2.5">
            <div className="mx-auto h-2.5 w-full animate-pulse rounded-full bg-white/[0.06]" />
            <div className="mx-auto h-2.5 w-4/5 animate-pulse rounded-full bg-white/[0.06]" style={{ animationDelay: "200ms" }} />
            <div className="mx-auto h-2.5 w-3/5 animate-pulse rounded-full bg-white/[0.06]" style={{ animationDelay: "400ms" }} />
          </div>
        </div>
      </section>
    </main>
  );
}
