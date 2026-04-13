import Link from "next/link";
import { headers } from "next/headers";
import type { AddressScore, ScoreTokenResponse } from "@meme-affinity/core";
import { LevelBadge } from "@/components/level-badge";
import { SiteNav } from "@/components/site-nav";
import { TradePanel } from "@/components/trade-panel";

export const dynamic = "force-dynamic";

type TokenPageProps = {
  params: Promise<{
    address: string;
  }>;
};

type ApiErrorPayload = {
  error?: string;
  details?: string;
};

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDisplayLevel(level: string) {
  switch (level) {
    case "LOVE_LOVE":
      return "爱爱";
    case "LOVE":
      return "爱";
    default:
      return "不爱";
  }
}

function getDisplayTone(level: string) {
  switch (level) {
    case "LOVE_LOVE":
    case "LOVE":
      return "love" as const;
    default:
      return "neutral" as const;
  }
}

function getDisplayPersonaLabel(label: string): string {
  if (label === "CZ") {
    return "CZ";
  }

  return label;
}

function getFixedDisplayName(score: AddressScore) {
  switch (score.id) {
    case "wangxiaoer":
      return "王小二";
    case "lengjing":
      return "冷静";
    case "afeng":
      return "阿峰";
    default:
      return score.label;
  }
}

async function resolveApiBaseUrl() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");

  if (host) {
    return `${protocol}://${host}`;
  }

  return process.env.PUBLIC_BASE_URL?.trim() || "http://localhost:3000";
}

async function fetchLiveScoreToken(
  tokenAddress: string
): Promise<{ data: ScoreTokenResponse | null; error: string | null }> {
  const baseUrl = await resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/score-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tokenAddress,
      chain: "bsc",
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | ScoreTokenResponse
    | ApiErrorPayload
    | null;

  if (!response.ok || !payload || !("token" in payload)) {
    const errorMessage =
      payload && "error" in payload && payload.error
        ? `${payload.error}${payload.details ? `. ${payload.details}` : ""}`
        : "Live scoring failed for this token.";

    return {
      data: null,
      error: errorMessage,
    };
  }

  return {
    data: payload,
    error: null,
  };
}

export default async function TokenDetailsPage({ params }: TokenPageProps) {
  const { address } = await params;
  const { data, error } = await fetchLiveScoreToken(address);

  if (!data) {
    return (
      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-6 md:px-10 md:py-8">
        <SiteNav current="token" ctaHref="/" ctaLabel="回首页" showTechLink={false} />

        <section className="surface-card-strong poster-enter px-6 py-8 md:px-8 md:py-10">
          <p className="section-kicker text-[var(--color-accent)]">评分暂不可用</p>
          <h1 className="display-copy mt-4 text-4xl font-semibold tracking-tight text-[var(--color-ink)] md:text-5xl">
            这枚币现在还没法顺利完成评分。
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--color-ink-soft)]">
            {error ?? "评分接口没有返回可用结果。"}
          </p>

          <div className="mt-8 rounded-[26px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
              目标合约
            </p>
            <p className="mt-3 break-all font-mono text-sm text-[var(--color-ink)]">
              {address}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full bg-[linear-gradient(135deg,#f4c76a_0%,#ff9b62_100%)] px-5 py-3 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[0_18px_40px_rgba(244,199,106,0.24)] transition hover:-translate-y-0.5"
            >
              回首页
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const token = data.token;
  const personaScores = data.personaScores;
  const fixedOrder = ["wangxiaoer", "lengjing", "afeng"] as const;
  const fixedOrderedScores = fixedOrder
    .map((id) => data.addressScores.find((score) => score.id === id))
    .filter((item): item is AddressScore => Boolean(item));
  const extraScores = data.addressScores.filter(
    (score) => !fixedOrder.includes(score.id as (typeof fixedOrder)[number])
  );
  const displayAddressScores = [...fixedOrderedScores, ...extraScores];

  return (
    <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-6 md:px-10 md:py-8">
      <SiteNav current="token" ctaHref="/" ctaLabel="再查一个" showTechLink={false} />

      {/* Token Header — compact */}
      <section className="surface-card-strong poster-enter relative overflow-hidden px-6 py-7 md:px-8 md:py-8">
        <div className="pointer-events-none absolute -right-16 top-6 hidden h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(241,199,106,0.24)_0%,transparent_72%)] blur-3xl lg:block" />

        <div className="relative">
          <p className="section-kicker text-[var(--color-accent)]">代币评分</p>
          <h1 className="display-copy mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            <span className="text-[var(--color-accent)]">{token.name}</span>
            {token.symbol ? (
              <span className="ml-3 text-2xl font-normal text-[var(--color-ink-soft)] md:text-3xl">
                {token.symbol}
              </span>
            ) : null}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <span className="text-xs text-[var(--color-muted)]">合约</span>
              <span className="font-mono text-xs text-[var(--color-ink)]">{formatAddress(token.address)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Scores — clean list layout */}
      <section className="mt-5">
        <article className="surface-card reveal-up px-6 py-6 md:px-7">
          <p className="section-kicker">评分总览</p>

          {/* Persona scores (赵赵爱吗) */}
          {personaScores.map((persona) => (
            <div
              key={persona.id}
              className="mt-5 flex items-center gap-4 rounded-[20px] border border-white/10 bg-[var(--color-panel-strong)] px-5 py-4"
            >
              <span className="text-2xl">{persona.displayEmoji}</span>
              <span className="text-lg font-semibold text-[var(--color-ink)] min-w-[3rem]">
                {getDisplayPersonaLabel(persona.label)}
              </span>
              <LevelBadge
                label={formatDisplayLevel(persona.displayLevel)}
                emoji={persona.displayEmoji}
                tone={getDisplayTone(persona.displayLevel)}
              />
              <span className="ml-auto text-xl font-bold tabular-nums text-[var(--color-accent)]">
                {persona.affinityScore}
              </span>
            </div>
          ))}

          {/* Address scores (车头爱吗) */}
          {displayAddressScores.map((score) => (
            <div
              key={score.id}
              className="mt-3 flex items-center gap-4 rounded-[20px] border border-white/10 bg-[var(--color-panel-strong)] px-5 py-4"
            >
              <span className="text-2xl">{score.displayEmoji}</span>
              <span className="text-lg font-semibold text-[var(--color-ink)] min-w-[3rem]">
                {getFixedDisplayName(score)}
              </span>
              <LevelBadge
                label={formatDisplayLevel(score.displayLevel)}
                emoji={score.displayEmoji}
                tone={getDisplayTone(score.displayLevel)}
              />
              <span className="ml-auto text-xl font-bold tabular-nums text-[var(--color-accent)]">
                {score.buyLikelihoodScore}
              </span>
            </div>
          ))}

        </article>
      </section>

      <section className="mt-6">
        <TradePanel
          tokenAddress={address}
          tokenName={token.name}
          tokenSymbol={token.symbol}
        />
      </section>
    </main>
  );
}
