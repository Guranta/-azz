"use client";

import Link from "next/link";

type SiteNavProps = {
  current?: "home" | "tech" | "token" | "azz";
  ctaHref?: string;
  ctaLabel?: string;
  showTechLink?: boolean;
  showAzzLink?: boolean;
};

function navClass(isActive: boolean): string {
  return isActive
    ? "border-white/16 bg-white/10 text-[var(--color-ink)]"
    : "border-white/8 bg-white/4 text-[var(--color-ink-soft)] hover:border-white/14 hover:bg-white/8 hover:text-[var(--color-ink)]";
}

function azzClass(isActive: boolean): string {
  return isActive
    ? "bg-[linear-gradient(135deg,#f4c76a_0%,#ff9b62_100%)] text-[var(--color-accent-ink)] shadow-[0_16px_34px_rgba(244,199,106,0.22)]"
    : "bg-[linear-gradient(135deg,rgba(244,199,106,0.85)_0%,rgba(255,155,98,0.85)_100%)] text-[var(--color-accent-ink)] shadow-[0_12px_28px_rgba(244,199,106,0.18)] hover:shadow-[0_16px_34px_rgba(244,199,106,0.28)]";
}

export function SiteNav({
  current,
  ctaHref,
  ctaLabel,
  showTechLink: _showTechLink = false,
  showAzzLink = true,
}: SiteNavProps) {
  void _showTechLink;

  return (
    <header className="mb-8 flex flex-col gap-5 rounded-[28px] border border-white/10 bg-[rgba(7,14,25,0.72)] px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between md:px-6">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-[18px] border border-white/10 bg-[linear-gradient(135deg,rgba(244,199,106,0.92)_0%,rgba(122,215,255,0.82)_100%)] text-xl shadow-[0_10px_30px_rgba(244,199,106,0.16)]">
          💛
        </div>
        <div>
          <p className="display-copy text-2xl font-semibold text-[var(--color-ink)]">
            爱赵赵
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.28em] text-[var(--color-accent)]">
            Meme Affinity Lab
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/"
          className={`rounded-full border px-4 py-2 text-sm transition ${navClass(current === "home")}`}
        >
          首页
        </Link>
        {showAzzLink ? (
          <Link
            href="/azz"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 ${azzClass(current === "azz")}`}
          >
            azz
          </Link>
        ) : null}
        {ctaHref && ctaLabel ? (
          <Link
            href={ctaHref}
            className="rounded-full bg-[linear-gradient(135deg,#f4c76a_0%,#ff9b62_100%)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[0_16px_34px_rgba(244,199,106,0.22)] transition hover:-translate-y-0.5"
          >
            {ctaLabel}
          </Link>
        ) : null}
      </div>
    </header>
  );
}
