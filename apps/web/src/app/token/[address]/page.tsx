import Link from "next/link";
import { headers } from "next/headers";
import type { ScoreTokenResponse } from "@meme-affinity/core";
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
  if (label === "CZ") return "👍 CZ";
  return label;
}

function formatRecommendation(value: string) {
  switch (value) {
    case "STRONG_BUY":
      return "强烈推荐";
    case "BUY":
      return "推荐买入";
    case "WATCH":
      return "继续观察";
    default:
      return "先别上头";
  }
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  })} ${date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}`;
}

function formatPercentage(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)}%`;
}

function getRiskTone(riskLevel: string) {
  switch (riskLevel) {
    case "LOW":
      return {
        badge: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
        copy: "这枚币的风险姿态相对收得住，还不算一眼劝退。",
      };
    case "MEDIUM":
      return {
        badge: "border-amber-300/30 bg-amber-300/10 text-amber-100",
        copy: "风险已经明显抬头，但还没到直接关页面的程度。",
      };
    case "HIGH":
      return {
        badge: "border-orange-400/30 bg-orange-400/10 text-orange-100",
        copy: "这类 profile 更偏快、更偏投机，也更容易碎。",
      };
    case "CRITICAL":
      return {
        badge: "border-rose-400/30 bg-rose-400/10 text-rose-100",
        copy: "这会在 live 流程里被当成明显红灯。",
      };
    default:
      return {
        badge: "border-white/10 bg-white/5 text-[var(--color-ink-soft)]",
        copy: "风险元数据不完整，所以页面会保守一点解释。",
      };
  }
}

function getLaunchpadTone(launchpad: string) {
  switch (launchpad) {
    case "fourmeme":
      return "border-amber-300/30 bg-amber-300/10 text-amber-100";
    case "flap":
      return "border-sky-300/30 bg-sky-300/10 text-sky-100";
    case "mixed":
      return "border-slate-300/30 bg-slate-300/10 text-slate-100";
    default:
      return "border-white/10 bg-white/5 text-[var(--color-ink-soft)]";
  }
}

function getRecommendationTone(value: string) {
  switch (value) {
    case "STRONG_BUY":
      return "border-emerald-300/35 bg-emerald-300/12 text-emerald-100";
    case "BUY":
      return "border-amber-300/35 bg-amber-300/12 text-amber-100";
    case "WATCH":
      return "border-cyan-300/35 bg-cyan-300/12 text-cyan-100";
    default:
      return "border-white/10 bg-white/6 text-[var(--color-ink-soft)]";
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
        <SiteNav current="token" ctaHref="/tech" ctaLabel="打开技术说明" />

        <section className="surface-card-strong poster-enter px-6 py-8 md:px-8 md:py-10">
          <p className="section-kicker text-[var(--color-accent)]">
            暂时拉不到 live 报告
          </p>
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
  const primaryPersona = data.personaScores[0] ?? null;
  const rankedAddressScores = [...data.addressScores].sort(
    (left, right) => right.buyLikelihoodScore - left.buyLikelihoodScore
  );
  const riskTone = getRiskTone(token.risk.riskLevel);
  const cacheLabel = data.cache.hit ? "聪明钱包热缓存" : "聪明钱包冷请求";
  const whaleHitCount = data.addressScores.filter(
    (score) => score.isTop100Holder
  ).length;

  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-6 md:px-10 md:py-8">
      <SiteNav current="token" ctaHref="/tech" ctaLabel="打开技术说明" />

      <section className="surface-card-strong poster-enter relative overflow-hidden px-6 py-7 md:px-8 md:py-8">
        <div className="pointer-events-none absolute -right-16 top-6 hidden h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(241,199,106,0.24)_0%,transparent_72%)] blur-3xl lg:block" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] ${getRecommendationTone(data.recommendation.value)}`}
            >
              {formatRecommendation(data.recommendation.value)}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] ${riskTone.badge}`}
            >
              {token.risk.riskLevel} 风险
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] ${getLaunchpadTone(token.launchpad)}`}
            >
              {token.launchpad}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[var(--color-ink-soft)]">
              {cacheLabel}
            </span>
          </div>

          <div className="mt-6 grid gap-8 xl:grid-cols-[1.06fr_0.94fr] xl:items-start">
            <div>
              <p className="section-kicker text-[var(--color-accent)]">
                Live V1 报告
              </p>
              <h1 className="display-copy mt-4 text-4xl font-semibold tracking-tight text-[var(--color-ink)] md:text-6xl">
                {token.name}{" "}
                <span className="text-[var(--color-accent)]">{token.symbol}</span>
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--color-ink-soft)]">
                {data.recommendation.summary}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {token.narrativeTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--color-ink)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-4">
                {[
                  [
                    "综合建议",
                    formatRecommendation(data.recommendation.value),
                    "三层信号聚合后的最终结论",
                  ],
                  ["人物卡", `${data.personaScores.length}`, "当前公开人物数量"],
                  ["鲸鱼命中", `${whaleHitCount}`, "固定地址进入 top100 的数量"],
                  [
                    "聪明钱",
                    `${data.smartMoney.matchedCount}`,
                    "top100 与聪明钱包的交集",
                  ],
                ].map(([label, value, copy]) => (
                  <div
                    key={label}
                    className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                      {label}
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                      {value}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--color-ink-soft)]">
                      {copy}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5">
              {primaryPersona ? (
                <div className="flex flex-col items-center gap-3 rounded-[28px] border border-white/10 bg-black/20 p-6 text-center">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{primaryPersona.displayEmoji}</span>
                    <span className="text-2xl font-semibold text-[var(--color-ink)]">
                      {getDisplayPersonaLabel(primaryPersona.label)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-semibold text-[var(--color-accent)]">
                      {primaryPersona.affinityScore}
                    </span>
                    <span className="text-sm uppercase tracking-[0.22em] text-[var(--color-muted)]">
                      喜爱程度
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  代币快照
                </p>
                <div className="mt-4 grid gap-3 text-sm">
                  <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-[var(--color-muted)]">合约</span>
                    <span className="font-mono text-[var(--color-ink)]">
                      {formatAddress(token.address)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-[var(--color-muted)]">缓存</span>
                    <span className="text-[var(--color-ink)]">{cacheLabel}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-[var(--color-muted)]">过期时间</span>
                    <span className="text-[var(--color-ink)]">
                      {formatTimestamp(data.cache.expiresAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-[var(--color-muted)]">风险分</span>
                    <span className="text-[var(--color-ink)]">
                      {token.risk.riskScore ?? "n/a"}
                    </span>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-4">
                    <p className="font-medium text-[var(--color-ink)]">
                      {riskTone.copy}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
        <article className="surface-card reveal-up px-6 py-7 md:px-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">人物评分</p>
              <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
                人物喜爱程度一览
              </h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {data.personaScores.map((persona) => (
              <div
                key={persona.id}
                className="flex flex-wrap items-center gap-4 rounded-[24px] border border-white/10 bg-[var(--color-panel-strong)] px-5 py-4"
              >
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
            ))}
          </div>
        </article>

        <article className="surface-card reveal-up px-6 py-7 md:px-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">聪明钱评分</p>
              <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
                聪明钱热度
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
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  聪明钱证据
                </p>
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

      <section className="mt-6 grid gap-6">
        <article className="surface-card reveal-up px-6 py-7 md:px-7">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="section-kicker">固定地址榜单</p>
              <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
                不是一堆卡片堆起来，而是一份按喜爱度排好的地址报告。
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[var(--color-ink-soft)]">
              主展示只保留 emoji、名字和喜爱程度；次级区域显示地址缩写、🐳、summary 和 evidence。
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {rankedAddressScores.map((score) => (
              <div
                key={score.id}
                className="rounded-[28px] border border-white/10 bg-[var(--color-panel-strong)] p-5"
              >
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="text-2xl">{score.displayEmoji}</span>
                  <span className="text-xl font-semibold text-[var(--color-ink)]">
                    {score.label}
                  </span>
                  <LevelBadge
                    label={formatDisplayLevel(score.displayLevel)}
                    emoji={score.displayEmoji}
                    tone={getDisplayTone(score.displayLevel)}
                  />
                  <span className="text-sm text-[var(--color-muted)]">
                    {formatAddress(score.address)}
                  </span>
                  {score.isTop100Holder ? (
                    <span className="text-cyan-300">
                      {score.holderEmoji}
                    </span>
                  ) : null}
                </div>

                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 mb-4">
                  <p className="text-sm leading-7 text-[var(--color-ink-soft)]">
                    {score.summary}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {score.evidence.slice(0, 2).map((item, evidenceIndex) => (
                    <div
                      key={`${score.id}-${evidenceIndex}`}
                      className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm leading-7 text-[var(--color-ink-soft)]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="surface-card reveal-up px-6 py-7 md:px-7">
          <p className="section-kicker">结论说明</p>
          <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            这页给你的，不只是分数，还有解释口径。
          </h2>

          <div className="mt-6 grid gap-4">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-sm leading-7 text-[var(--color-ink-soft)]">
              <p className="font-semibold text-[var(--color-ink)]">风险解释</p>
              <p className="mt-2">{riskTone.copy}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-sm leading-7 text-[var(--color-ink-soft)]">
              <p className="font-semibold text-[var(--color-ink)]">缓存说明</p>
              <p className="mt-2">
                当前结果属于 <span className="text-[var(--color-ink)]">{cacheLabel}</span>，
                过期时间为 {formatTimestamp(data.cache.expiresAt)}。
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-sm leading-7 text-[var(--color-ink-soft)]">
              <p className="font-semibold text-[var(--color-ink)]">叙事包</p>
              <p className="mt-2">
                这次评分读取了代币名称、代币符号、发射台、叙事标签、风险等级、top100 持仓和聪明钱命中信息。
              </p>
            </div>
          </div>
        </article>

        <article className="surface-card reveal-up px-6 py-7 md:px-7">
          <p className="section-kicker">警告信息</p>
          <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            如果上游有波动，这里会直接告诉你。
          </h2>

          {data.errors.length ? (
            <div className="mt-6 space-y-3">
              {data.errors.map((item, index) => (
                <div
                  key={`error-${index}`}
                  className="rounded-[22px] border border-rose-300/20 bg-rose-300/8 px-4 py-4 text-sm leading-7 text-rose-50"
                >
                  {item}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[24px] border border-emerald-300/20 bg-emerald-300/8 px-5 py-5 text-sm leading-7 text-emerald-50">
              这一轮没有额外警告。页面当前拿到的是完整 live 合约。
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full bg-[linear-gradient(135deg,#f4c76a_0%,#ff9b62_100%)] px-5 py-3 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[0_18px_40px_rgba(244,199,106,0.24)] transition hover:-translate-y-0.5"
            >
              再扫一枚币
            </Link>
            <Link
              href="/tech"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-[var(--color-ink)] transition hover:border-white/18 hover:bg-white/10"
            >
              查看技术说明
            </Link>
          </div>
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
