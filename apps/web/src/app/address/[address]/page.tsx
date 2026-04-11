import Link from "next/link";
import { headers } from "next/headers";
import type { ScoreAddressResponse } from "@meme-affinity/core";
import { SiteNav } from "@/components/site-nav";

export const dynamic = "force-dynamic";

type AddressPageProps = {
  params: Promise<{
    address: string;
  }>;
};

type ApiErrorPayload = {
  error?: string;
  details?: string;
  errors?: string[];
};

const STYLE_LABELS: Record<string, string> = {
  "fourmeme-launchpad": "Fourmeme 偏好",
  "flap-launchpad": "Flap 偏好",
  "mixed-launchpad": "双平台混合",
  "unknown-launchpad": "平台信号不足",
  sniper: "狙击型",
  scalper: "快进快出",
  "swing-trader": "波段型",
  holder: "拿得住",
  "low-frequency": "低频",
  active: "活跃",
  "high-frequency": "高频",
  "repeat-buyer": "重复买入",
  "one-shot-rotator": "一把一换",
  cautious: "谨慎",
  balanced: "均衡",
  aggressive: "激进",
};

function formatAddress(address: string) {
  if (address.length <= 10) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "n/a";
  }

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

function getArchetypeTone(archetype: ScoreAddressResponse["profile"]["archetype"]) {
  switch (archetype) {
    case "钻石手":
      return "border-emerald-300/35 bg-emerald-300/12 text-emerald-100";
    case "畜生":
      return "border-rose-300/30 bg-rose-300/12 text-rose-50";
    case "P子":
      return "border-cyan-300/35 bg-cyan-300/12 text-cyan-100";
    default:
      return "border-white/10 bg-white/5 text-[var(--color-ink-soft)]";
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

function getConfidenceTone(confidence: string) {
  switch (confidence) {
    case "high":
      return "border-emerald-300/35 bg-emerald-300/12 text-emerald-100";
    case "medium":
      return "border-cyan-300/35 bg-cyan-300/12 text-cyan-100";
    default:
      return "border-white/10 bg-white/5 text-[var(--color-ink-soft)]";
  }
}

function getSourceTone(sourceStatus: string) {
  switch (sourceStatus) {
    case "live":
      return "border-emerald-300/35 bg-emerald-300/12 text-emerald-100";
    case "unavailable":
      return "border-rose-300/25 bg-rose-300/10 text-rose-50";
    case "mock":
    case "manual":
      return "border-cyan-300/35 bg-cyan-300/12 text-cyan-100";
    default:
      return "border-white/10 bg-white/5 text-[var(--color-ink-soft)]";
  }
}

function getRefinementTone(refinementSource: string) {
  switch (refinementSource) {
    case "minimax":
      return "border-amber-300/30 bg-amber-300/10 text-amber-100";
    case "minimax-fallback":
      return "border-cyan-300/35 bg-cyan-300/12 text-cyan-100";
    default:
      return "border-white/10 bg-white/5 text-[var(--color-ink-soft)]";
  }
}

function formatLaunchpad(value: string) {
  switch (value) {
    case "fourmeme":
      return "Fourmeme";
    case "flap":
      return "Flap";
    case "mixed":
      return "混合";
    default:
      return "未知";
  }
}

function formatRiskAppetite(value: string) {
  switch (value) {
    case "cautious":
      return "谨慎";
    case "balanced":
      return "均衡";
    case "aggressive":
      return "激进";
    default:
      return "未知";
  }
}

function formatSourceStatus(value: string) {
  switch (value) {
    case "live":
      return "实时";
    case "mock":
      return "模拟";
    case "manual":
      return "人工";
    default:
      return "不可用";
  }
}

function formatRefinementSource(value: string) {
  switch (value) {
    case "minimax":
      return "MiniMax 润色";
    case "minimax-fallback":
      return "MiniMax 回退";
    default:
      return "纯规则";
  }
}

function formatStyleLabel(value: string) {
  return STYLE_LABELS[value] ?? value;
}

function formatRoiPct(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

function formatHoldMinutes(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  if (value >= 1440) {
    return `${(value / 1440).toFixed(1)} 天`;
  }

  if (value >= 60) {
    return `${(value / 60).toFixed(1)} 小时`;
  }

  return `${Math.round(value)} 分钟`;
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

async function fetchLiveScoreAddress(
  address: string
): Promise<{ data: ScoreAddressResponse | null; error: string | null }> {
  const baseUrl = await resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/score-address`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address,
      chain: "bsc",
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | ScoreAddressResponse
    | ApiErrorPayload
    | null;

  if (!payload || !("profile" in payload)) {
    return {
      data: null,
      error: "Address profiling failed for this wallet.",
    };
  }

  return {
    data: payload,
    error: response.ok ? null : payload.errors?.[0] ?? "Address profiling failed for this wallet.",
  };
}

export default async function AddressDetailsPage({ params }: AddressPageProps) {
  const { address } = await params;
  const { data, error } = await fetchLiveScoreAddress(address);

  if (!data) {
    return (
      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-6 md:px-10 md:py-8">
        <SiteNav ctaHref="/" ctaLabel="回首页" />

        <section className="surface-card-strong poster-enter px-6 py-8 md:px-8 md:py-10">
          <p className="section-kicker text-[var(--color-accent)]">
            钱包画像暂不可用
          </p>
          <h1 className="display-copy mt-4 text-4xl font-semibold tracking-tight text-[var(--color-ink)] md:text-5xl">
            这次没有拿到可渲染的钱包画像。
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--color-ink-soft)]">
            {error ?? "地址画像接口没有返回可用结果。"}
          </p>

          <div className="mt-8 rounded-[26px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
              目标地址
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

  const profile = data.profile;
  const cacheLabel = data.cache.hit ? "画像缓存命中" : "实时画像生成";
  const warnings = Array.from(new Set(error ? [error, ...data.errors] : data.errors));

  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-6 md:px-10 md:py-8">
      <SiteNav ctaHref="/" ctaLabel="再查一个" />

      <section className="surface-card-strong poster-enter relative overflow-hidden px-6 py-7 md:px-8 md:py-8">
        <div className="pointer-events-none absolute -right-16 top-6 hidden h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(122,215,255,0.18)_0%,transparent_72%)] blur-3xl lg:block" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] ${getArchetypeTone(profile.archetype)}`}
            >
              {profile.archetype}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] ${getSourceTone(profile.sourceStatus)}`}
            >
              {formatSourceStatus(profile.sourceStatus)}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] ${getConfidenceTone(profile.confidence)}`}
            >
              {profile.confidence} 置信度
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] ${getLaunchpadTone(profile.launchpadBias)}`}
            >
              {formatLaunchpad(profile.launchpadBias)}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] ${getRefinementTone(profile.refinementSource)}`}
            >
              {formatRefinementSource(profile.refinementSource)}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[var(--color-ink-soft)]">
              {cacheLabel}
            </span>
          </div>

          <div className="mt-6 grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
            <div>
              <p className="section-kicker text-[var(--color-accent)]">
                钱包画像
              </p>
              <h1 className="display-copy mt-4 break-all text-4xl font-semibold tracking-tight text-[var(--color-ink)] md:text-5xl">
                {formatAddress(data.address.address)}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--color-ink-soft)]">
                {profile.summary}
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-4">
                {[
                  ["主标签", profile.archetype, "本页只返回纯钱包画像，不再附带人物或固定地址评分。"],
                  ["风险偏好", formatRiskAppetite(profile.riskAppetite), "由持仓时间、翻转率和仓位波动综合得出。"],
                  ["近期交易", `${profile.recentTradeCount}`, "仅统计近期 fourmeme / flap meme 活动。"],
                  ["近期代币", `${profile.recentTokens.length}`, "参与画像判断的近期代币上下文。"],
                ].map(([label, value, copy]) => (
                  <div
                    key={label}
                    className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                      {label}
                    </p>
                    <p className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
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
              <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  地址信息
                </p>
                <div className="mt-4 grid gap-3 text-sm">
                  <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-[var(--color-muted)]">地址</span>
                    <span className="font-mono text-[var(--color-ink)]">
                      {formatAddress(data.address.address)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-[var(--color-muted)]">链</span>
                    <span className="text-[var(--color-ink)]">{data.address.chain}</span>
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
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  风格标签
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.style.length ? (
                    profile.style.map((style) => (
                      <span
                        key={style}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs tracking-[0.18em] text-[var(--color-ink)]"
                      >
                        {formatStyleLabel(style)}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs tracking-[0.18em] text-[var(--color-ink-soft)]">
                      暂无稳定标签
                    </span>
                  )}
                </div>

                <p className="mt-6 text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  偏好叙事
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.favoriteNarratives.length ? (
                    profile.favoriteNarratives.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-cyan-300/20 bg-cyan-300/8 px-3 py-1 text-xs tracking-[0.18em] text-cyan-100"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs tracking-[0.18em] text-[var(--color-ink-soft)]">
                      暂无
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <article className="surface-card reveal-up px-6 py-7 md:px-7">
          <p className="section-kicker">近期代币上下文</p>
          <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            画像只围绕近期 meme 行为做归纳。
          </h2>

          {profile.recentTokens.length ? (
            <div className="mt-6 space-y-4">
              {profile.recentTokens.map((token) => (
                <div
                  key={token.tokenAddress}
                  className="rounded-[24px] border border-white/10 bg-[var(--color-panel-strong)] p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[var(--color-ink)]">
                        {token.symbol}
                      </p>
                      <p className="mt-1 break-all font-mono text-xs text-[var(--color-muted)]">
                        {token.tokenAddress}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] ${getLaunchpadTone(token.launchpad)}`}
                    >
                      {formatLaunchpad(token.launchpad)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                        ROI
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                        {formatRoiPct(token.roiPct)}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                        持有时长
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                        {formatHoldMinutes(token.holdMinutes)}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 sm:col-span-2 lg:col-span-1">
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                        叙事标签
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                        {token.narrativeTags.length ? token.narrativeTags.join(" / ") : "暂无"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 px-5 py-5 text-sm leading-7 text-[var(--color-ink-soft)]">
              当前样本里没有足够的 recent token context，因此画像保持保守。
            </div>
          )}
        </article>

        <article className="surface-card reveal-up px-6 py-7 md:px-7">
          <p className="section-kicker">画像证据</p>
          <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            为什么这只钱包会被归成这个样子。
          </h2>

          <div className="mt-6 space-y-3">
            {profile.evidence.map((item, index) => (
              <div
                key={`evidence-${index}`}
                className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-[var(--color-ink-soft)]"
              >
                {item}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="surface-card reveal-up px-6 py-7 md:px-7">
          <p className="section-kicker">解释边界</p>
          <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            Address 路径现在只展示纯钱包画像。
          </h2>

          <div className="mt-6 space-y-3">
            {[
              "不会在这个页面展示 CZ 评分。",
              "不会在这个页面展示 smart-money 评分。",
              "不会在这个页面展示 fixed-address similarity。",
              "token 路径仍然保留完整评分页和推荐逻辑。",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-[var(--color-ink-soft)]"
              >
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card reveal-up px-6 py-7 md:px-7">
          <p className="section-kicker">警告信息</p>
          <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            上游波动或数据不足会直接在这里说明。
          </h2>

          {warnings.length ? (
            <div className="mt-6 space-y-3">
              {warnings.map((item, index) => (
                <div
                  key={`warning-${index}`}
                  className="rounded-[22px] border border-rose-300/20 bg-rose-300/8 px-4 py-4 text-sm leading-7 text-rose-50"
                >
                  {item}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[24px] border border-emerald-300/20 bg-emerald-300/8 px-5 py-5 text-sm leading-7 text-emerald-50">
              这次画像没有额外警告。
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full bg-[linear-gradient(135deg,#f4c76a_0%,#ff9b62_100%)] px-5 py-3 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[0_18px_40px_rgba(244,199,106,0.24)] transition hover:-translate-y-0.5"
            >
              再查一个地址
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
    </main>
  );
}
