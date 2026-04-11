export default function TokenLoading() {
  return (
    <main className="relative mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-12 md:px-10">
      <section className="surface-card-strong w-full px-6 py-16 text-center md:px-10">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center">
          <span className="absolute h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-[var(--color-accent)]" />
          <span className="h-6 w-6 animate-pulse rounded-full bg-white/20" />
        </div>
        <h1 className="display-copy text-4xl font-semibold tracking-tight text-[var(--color-ink)]">
          {"\u4ee3\u5e01\u62fc\u547d\u5206\u6790\u4e2d"}
        </h1>
        <p className="mt-4 text-base text-[var(--color-ink-soft)]">
          {"\u9884\u8ba1\u9700\u8981\u7ea6 1 \u5206\u949f"}
        </p>
      </section>
    </main>
  );
}
