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

function getRiskBadgeTone(riskLevel: string) {
  switch (riskLevel) {
    case "LOW":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
    case "MEDIUM":
      return "border-amber-300/30 bg-amber-300/10 text-amber-100";
    case "HIGH":
      return "border-orange-400/30 bg-orange-400/10 text-orange-100";
    case "CRITICAL":
      return "border-rose-400/30 bg-rose-400/10 text-rose-100";
    default:
      return "border-white/10 bg-white/5 text-[var(--color-ink-soft)]";
  }
}

function formatPercentage(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)}%`;
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
        <SiteNav current="token" ctaHref="/tech" ctaLabel="打开技术说明" />

        <section className="surface-card-strong poster-enter px-6 py-8 md:px-8 md:py-10">
          <p className="section-kicker text-[var(--color-accent)]">暂时拿不到 live 报告</p>
          <h1 className="display-copy mt-4 text-4xl font-semibold tracking-tight text-[var(--color-ink)] md:text-5xl">
            这枚币现在还没法顺利完成评分。
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--color-ink-soft)]">
            {error ?? "live API 没有返回一份可用的评分结果。"}
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
            <Link
              href="/tech"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-[var(--color-ink)] transition hover:border-white/18 hover:bg-white/10"
            >
              看技术说明
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
    <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-6 md:px-10 md:py-8">
      <SiteNav current="token" ctaHref="/tech" ctaLabel="打开技术说明" />

      <section className="surface-card-strong poster-enter relative overflow-hidden px-6 py-7 md:px-8 md:py-8">
        <div className="pointer-events-none absolute -right-16 top-6 hidden h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(241,199,106,0.24)_0%,transparent_72%)] blur-3xl lg:block" />
        <div className="relative grid gap-8 xl:grid-cols-[1fr_0.95fr] xl:items-start">
          <div>
            <p className="section-kicker text-[var(--color-accent)]">Live V1 报告</p>
            <h1 className="display-copy mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
              <span className="text-[var(--color-accent)]">{token.name}</span>
            </h1>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
              代币快照
            </p>

            <div className="mt-4 grid gap-3 text-sm">
              <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[var(--color-muted)]">合约地址</p>
                <p className="mt-1 break-all font-mono text-[var(--color-ink)]">{token.address}</p>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-[var(--color-muted)]">代币符号</span>
                <span className="text-[var(--color-ink)]">{token.symbol || "n/a"}</span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-[var(--color-muted)]">风险等级</span>
                <span
                  className={`rounded-full border px-2 py-1 text-xs uppercase tracking-[0.2em] ${getRiskBadgeTone(token.risk.riskLevel)}`}
                >
                  {token.risk.riskLevel}
                </span>
              </div>
              {token.narrativeTags.length ? (
                <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[var(--color-muted)]">叙事标签</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {token.narrativeTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs tracking-[0.18em] text-[var(--color-ink)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <p className="mt-4 text-xs leading-6 text-[var(--color-ink-soft)]">
              分数基于本地模型和 AI，不能保证完全正确
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <article className="surface-card reveal-up px-6 py-7 md:px-7">
          <p className="section-kicker">赵赵爱吗</p>
          <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            👍 CZ
          </h2>

          <div className="mt-6 space-y-4">
            {personaScores.map((persona) => (
              <div
                key={persona.id}
                className="rounded-[24px] border border-white/10 bg-[var(--color-panel-strong)] px-5 py-4"
              >
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-3xl">{persona.displayEmoji}</span>
                  <span className="text-xl font-semibold text-[var(--color-ink)]">
                    {getDisplayPersonaLabel(persona.label)}
                  </span>
                  <LevelBadge
                    label={formatDisplayLevel(persona.displayLevel)}
                    emoji={persona.displayEmoji}
                    tone={getDisplayTone(persona.displayLevel)}
                  />
                  <span className="text-2xl font-semibold text-[var(--color-accent)]">
                    {persona.affinityScore}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--color-ink-soft)]">{persona.summary}</p>
                {persona.evidence.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {persona.evidence.slice(0, 2).map((item, index) => (
                      <span
                        key={`${persona.id}-evidence-${index}`}
                        className="rounded-[16px] border border-white/10 bg-black/20 px-3 py-2 text-xs leading-6 text-[var(--color-ink-soft)]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6">
        <article className="surface-card reveal-up px-6 py-7 md:px-7">
          <p className="section-kicker">车头爱吗</p>
          <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            王小二 / 冷静 / 阿峰
          </h2>

          <div className="mt-6 space-y-4">
            {displayAddressScores.map((score) => (
              <div
                key={score.id}
                className="rounded-[26px] border border-white/10 bg-[var(--color-panel-strong)] p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-2xl">{score.displayEmoji}</span>
                  <span className="text-xl font-semibold text-[var(--color-ink)]">
                    {getFixedDisplayName(score)}
                  </span>
                  <LevelBadge
                    label={`喜爱程度：${formatDisplayLevel(score.displayLevel)}`}
                    emoji={score.displayEmoji}
                    tone={getDisplayTone(score.displayLevel)}
                  />
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-[var(--color-ink)]">
                    分数 {score.buyLikelihoodScore}
                  </span>
                </div>

                <div className="mt-4 rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-sm leading-7 text-[var(--color-ink-soft)]">{score.summary}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {score.evidence.map((item, evidenceIndex) => (
                    <span
                      key={`${score.id}-${evidenceIndex}`}
                      className="rounded-[16px] border border-white/10 bg-white/5 px-3 py-2 text-xs leading-6 text-[var(--color-ink-soft)]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6">
        <article className="surface-card reveal-up px-6 py-7 md:px-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">聪明钱爱吗</p>
              <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
                聪明钱
              </h2>
            </div>
            <LevelBadge
              label={formatDisplayLevel(data.smartMoney.displayLevel)}
              emoji={data.smartMoney.displayEmoji}
              tone={getDisplayTone(data.smartMoney.displayLevel)}
            />
          </div>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-[var(--color-panel-strong)] p-5">
            <div className="grid gap-4 lg:grid-cols-[0.45fr_0.55fr]">
              <div>
                <p className="text-5xl font-semibold text-[var(--color-ink)]">
                  {data.smartMoney.matchedCount}
                </p>
                <p className="mt-2 text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">
                  命中钱包数
                </p>
                <p className="mt-4 text-sm leading-7 text-[var(--color-ink-soft)]">
                  {data.smartMoney.summary}
                </p>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">evidence</p>
                <div className="mt-4 space-y-3">
                  {data.smartMoney.evidence.map((item, index) => (
                    <div
                      key={`smartmoney-evidence-${index}`}
                      className="rounded-[16px] border border-white/10 bg-white/5 px-3 py-3 text-sm leading-6 text-[var(--color-ink-soft)]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {data.smartMoney.matches.length ? (
              <div className="mt-5 grid gap-3">
                {data.smartMoney.matches.slice(0, 4).map((match, index) => (
                  <div
                    key={`${match.address}-${index}`}
                    className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="font-mono text-sm text-[var(--color-ink)]">
                        {formatAddress(match.address)}
                      </span>
                      <div className="flex flex-wrap gap-2 text-xs text-[var(--color-ink-soft)]">
                        <span className="rounded-full border border-white/10 px-2 py-1">
                          rank {match.rank ?? "n/a"}
                        </span>
                        <span className="rounded-full border border-white/10 px-2 py-1">
                          {formatPercentage(match.percentage)}
                        </span>
                        {match.tag ? (
                          <span className="rounded-full border border-cyan-300/20 px-2 py-1 text-cyan-100">
                            {match.tag}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </article>
      </section>

      {data.errors.length ? (
        <section className="mt-4">
          <div className="rounded-[18px] border border-amber-300/25 bg-amber-300/8 px-4 py-3">
            <p className="text-xs leading-6 text-amber-100/90">
              提示：{data.errors.join("；")}
            </p>
          </div>
        </section>
      ) : null}

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
