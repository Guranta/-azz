import Link from "next/link";
import { LogoBadge } from "@/components/logo-badge";

const SPONSORS = [
  {
    name: "AVE",
    badge: "Data Partner",
    copy: "提供 token detail、risk、top100 holders 和 smart wallet 能力，支撑整条 live 数据链路。",
    href: "https://ave.ai/",
    logoKey: "sponsor-ave",
  },
  {
    name: "MiniMax",
    badge: "Scoring Partner",
    copy: "人物评分和固定地址最终判断都留在服务端完成，不把模型逻辑泄到前端。",
    href: "https://platform.minimax.io/",
    logoKey: "sponsor-minimax",
  },
  {
    name: "BNB Chain",
    badge: "Chain Surface",
    copy: "V1 只聚焦 BSC，把 fourmeme 和 flap 当成重点发射场景先做透。",
    href: "https://www.bnbchain.org/",
    logoKey: "sponsor-bnb",
  },
];

export function SponsorSurface() {
  return (
    <section className="mt-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">赞助席位</p>
          <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)] md:text-4xl">
            先放占位 logo，后面再替换正式 sponsor 物料。
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-[var(--color-ink-soft)]">
          这一块先保持轻量：真实官网链接、统一卡片骨架、可替换的 logo 占位，
          不需要改产品架构就能切成正式赞助区。
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {SPONSORS.map((sponsor) => (
          <Link
            key={sponsor.name}
            href={sponsor.href}
            target="_blank"
            rel="noreferrer"
            className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(8,16,30,0.72)] p-5 transition hover:-translate-y-1 hover:border-white/18 hover:bg-[rgba(10,20,36,0.84)]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)] opacity-60" />
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <LogoBadge
                  logoKey={sponsor.logoKey}
                  label={sponsor.name}
                  size="lg"
                />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-accent)]">
                    {sponsor.badge}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
                    {sponsor.name}
                  </h3>
                </div>
              </div>
              <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-soft)] transition group-hover:border-white/16 group-hover:text-[var(--color-ink)]">
                打开
              </span>
            </div>

            <p className="mt-5 text-sm leading-7 text-[var(--color-ink-soft)]">
              {sponsor.copy}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
