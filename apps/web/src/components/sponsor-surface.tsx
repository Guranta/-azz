import Link from "next/link";
import { LogoBadge } from "@/components/logo-badge";

const SPONSORS = [
  {
    name: "AVE",
    href: "https://ave.ai/",
    logoKey: "sponsor-ave",
  },
  {
    name: "MiniMax",
    href: "https://platform.minimax.io/",
    logoKey: "sponsor-minimax",
  },
  {
    name: "BNB Chain",
    href: "https://www.bnbchain.org/",
    logoKey: "sponsor-bnb",
  },
] as const;

const AVE_BASELINE_OFFSET = 12_000;
// TODO(C13-A): Calibrate baseline offset with production historical backfill.

type SponsorSurfaceProps = {
  aveTotalCount: number;
};

export function SponsorSurface({ aveTotalCount }: SponsorSurfaceProps) {
  const aveDisplayCount = Math.max(0, aveTotalCount + AVE_BASELINE_OFFSET);

  return (
    <section className="mt-8">
      <div className="grid gap-4 md:grid-cols-3">
        {SPONSORS.map((sponsor) => (
          <Link
            key={sponsor.name}
            href={sponsor.href}
            target="_blank"
            rel="noreferrer"
            className="group rounded-[26px] border border-white/10 bg-[rgba(8,16,30,0.72)] p-5 transition hover:-translate-y-1 hover:border-white/18 hover:bg-[rgba(10,20,36,0.84)]"
          >
            <div className="flex items-center gap-4">
              <LogoBadge logoKey={sponsor.logoKey} label={sponsor.name} size="lg" />
              <h2 className="display-copy text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                {sponsor.name}
              </h2>
            </div>

            {sponsor.name === "AVE" ? (
              <p className="mt-6 text-sm text-[var(--color-ink-soft)]">
                {"\u7d2f\u8ba1\u8c03\u7528"}{" "}
                <span className="font-semibold text-[var(--color-accent)]">
                  {aveDisplayCount.toLocaleString("zh-CN")}
                </span>{" "}
                {"\u6b21"}
              </p>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
