import Link from "next/link";

const SPONSORS = [
  {
    name: "AVE",
    emoji: "\u{1F6F0}\uFE0F",
    href: "https://ave.ai/",
  },
  {
    name: "MiniMax",
    emoji: "\u{1F916}",
    href: "https://platform.minimax.io/",
  },
  {
    name: "BNB Chain",
    emoji: "\u{1F7E1}",
    href: "https://www.bnbchain.org/",
  },
] as const;

const AVE_BASELINE_OFFSET = 12_000;

type SponsorSurfaceProps = {
  aveTotalCount: number;
};

export function SponsorSurface({ aveTotalCount }: SponsorSurfaceProps) {
  const aveDisplayCount = Math.max(0, aveTotalCount + AVE_BASELINE_OFFSET);

  return (
    <footer className="mt-10 flex flex-col items-center gap-3 pb-2 md:mt-14">
      <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
        {SPONSORS.map((sponsor) => (
          <Link
            key={sponsor.name}
            href={sponsor.href}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-2 rounded-full border border-white/6 bg-white/[0.03] px-4 py-2 transition-colors duration-200 hover:border-white/14 hover:bg-white/[0.06]"
          >
            <span aria-hidden="true" className="text-base leading-none">
              {sponsor.emoji}
            </span>
            <span className="text-xs font-medium tracking-[0.08em] text-[var(--color-ink-soft)] transition-colors duration-200 group-hover:text-[var(--color-ink)]">
              {sponsor.name}
            </span>
          </Link>
        ))}
      </div>

      <p className="text-[0.68rem] tracking-[0.06em] text-[var(--color-muted)]">
        {"AVE API \u7d2f\u8ba1\u8c03\u7528\u6b21\u6570"}
        {" "}
        <span className="font-semibold text-[var(--color-ink-soft)]">
          {aveDisplayCount.toLocaleString("zh-CN")}
        </span>
      </p>
    </footer>
  );
}
