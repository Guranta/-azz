import type { StrategySnapshot } from "@meme-affinity/core";
import { SiteNav } from "@/components/site-nav";
import { EquityChart } from "@/components/equity-chart";
import { loadSnapshots, loadEquityPoints, getLatestRefreshAt, computeRefreshStatus } from "@/lib/strategy-db";
import { ensureFresh } from "@/lib/strategy-scheduler";
import { getCandidatePoolInfo } from "@/lib/strategy-engine";

export const dynamic = "force-dynamic";

export const revalidate = 0;

const STRATEGY_META: Record<string, { emoji: string; desc: string }> = {
  gambler: { emoji: "🎰", desc: "高频激进，短线为王" },
  "p-zi": { emoji: "📊", desc: "趋势共振，中频偏稳" },
  diamond: { emoji: "💎", desc: "高置信长持，低频精选" },
};

function formatPnl(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function pnlColor(pct: number): string {
  if (pct > 0) return "text-emerald-300";
  if (pct < 0) return "text-rose-300";
  return "text-[var(--color-ink-soft)]";
}

function formatAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

type RefreshStatus = "ok" | "stale" | "never";

function statusBadge(status: RefreshStatus) {
  switch (status) {
    case "ok":
      return "border-emerald-300/30 bg-emerald-300/10 text-emerald-200";
    case "stale":
      return "border-amber-300/30 bg-amber-300/10 text-amber-200";
    case "never":
      return "border-rose-300/30 bg-rose-300/10 text-rose-200";
  }
}

function statusLabel(status: RefreshStatus): string {
  switch (status) {
    case "ok":
      return "数据正常";
    case "stale":
      return "展示旧快照";
    case "never":
      return "等待首次刷新";
  }
}

function StrategyCard({ snap }: { snap: StrategySnapshot }) {
  const meta = STRATEGY_META[snap.strategyId] ?? { emoji: "⚡", desc: "" };
  const holdingsValue = snap.holdings.reduce((s, h) => s + h.currentValueUsd, 0);

  return (
    <div className="surface-card rounded-[28px] border border-white/10 px-6 py-6 md:px-7">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">{meta.emoji}</span>
        <div>
          <h3 className="text-xl font-semibold text-[var(--color-ink)]">{snap.strategyName}</h3>
          <p className="text-xs text-[var(--color-ink-soft)]">{meta.desc}</p>
        </div>
      </div>

      {/* Key metrics */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs text-[var(--color-muted)]">净值</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-[var(--color-accent)]">
            ${snap.equityUsd.toFixed(2)}
          </p>
        </div>
        <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs text-[var(--color-muted)]">累计收益</p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${pnlColor(snap.totalPnlPct)}`}>
            {formatPnl(snap.totalPnlPct)}
          </p>
        </div>
        <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs text-[var(--color-muted)]">现金</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-[var(--color-ink)]">
            ${snap.cashUsd.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Holdings */}
      {snap.holdings.length > 0 ? (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
            当前持仓（${holdingsValue.toFixed(2)}）
          </p>
          <div className="mt-2 space-y-2">
            {snap.holdings.map((h) => (
              <div
                key={h.tokenAddress}
                className="flex items-center justify-between gap-3 rounded-[14px] border border-white/8 bg-white/[0.03] px-4 py-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-[var(--color-ink)] truncate">
                    {h.tokenName}
                  </span>
                  <span className="text-xs text-[var(--color-muted)]">{h.tokenSymbol}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-sm font-bold tabular-nums ${pnlColor(h.pnlPct)}`}>
                    {formatPnl(h.pnlPct)}
                  </span>
                  <span className="text-xs text-[var(--color-ink-soft)] tabular-nums">
                    ${h.currentValueUsd.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
            当前持仓
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">空仓</p>
        </div>
      )}

      {/* Latest draft */}
      <div className="mt-5 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">最新草稿</p>
        <div className="mt-2 flex items-center gap-3 text-sm">
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
              snap.latestDraft.action === "buy"
                ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                : snap.latestDraft.action === "sell"
                  ? "border-rose-300/30 bg-rose-300/10 text-rose-200"
                  : "border-white/10 bg-white/5 text-[var(--color-ink-soft)]"
            }`}
          >
            {snap.latestDraft.action === "buy"
              ? "买入"
              : snap.latestDraft.action === "sell"
                ? "卖出"
                : "持有"}
          </span>
          {snap.latestDraft.tokenAddress && (
            <span className="font-mono text-xs text-[var(--color-ink-soft)]">
              {formatAddr(snap.latestDraft.tokenAddress)}
            </span>
          )}
          <span className="text-xs text-[var(--color-ink-soft)]">{snap.latestDraft.reason}</span>
        </div>
      </div>

      {/* Recent trades */}
      {snap.recentTrades.length > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
            最近交易
          </p>
          <div className="mt-2 space-y-2">
            {snap.recentTrades.slice(-5).reverse().map((t, i) => (
              <div
                key={`${t.executedAt}-${i}`}
                className="flex items-center justify-between gap-3 rounded-[12px] border border-white/6 bg-white/[0.02] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      t.action === "buy" ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {t.action === "buy" ? "买入" : "卖出"}
                  </span>
                  <span className="text-xs text-[var(--color-ink)]">{t.tokenName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs tabular-nums text-[var(--color-ink-soft)]">
                    ${t.amountUsd.toFixed(2)}
                  </span>
                  <span className="text-xs tabular-nums text-[var(--color-muted)]">
                    {formatTime(t.executedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default async function AzzPage() {
  await ensureFresh();

  const snapshots = loadSnapshots();
  const equityPoints = loadEquityPoints();
  const lastRefreshAt = getLatestRefreshAt();
  const poolInfo = getCandidatePoolInfo();

  // Compute true refresh status (same logic as /api/azz/snapshot)
  const refreshStatus = computeRefreshStatus(lastRefreshAt);

  return (
    <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-6 md:px-10 md:py-8">
      <SiteNav current="azz" showTechLink={true} />

      {/* Top overview */}
      <section className="surface-card-strong poster-enter px-6 py-7 md:px-8 md:py-8">
        <p className="section-kicker text-[var(--color-accent)]">模拟策略</p>
        <h1 className="display-copy mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
          <span className="text-[var(--color-accent)]">azz</span> 策略盘
        </h1>

        {/* Strategy summaries */}
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {(["gambler", "p-zi", "diamond"] as const).map((id) => {
            const meta = STRATEGY_META[id];
            const snap = snapshots.find((s) => s.strategyId === id);
            return (
              <div
                key={id}
                className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span>{meta.emoji}</span>
                  <span className="text-sm font-semibold text-[var(--color-ink)]">
                    {snap?.strategyName ?? meta.desc.split("，")[0]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{meta.desc}</p>
                {snap && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-bold tabular-nums text-[var(--color-accent)]">
                      ${snap.equityUsd.toFixed(2)}
                    </span>
                    <span className={`text-xs font-semibold tabular-nums ${pnlColor(snap.totalPnlPct)}`}>
                      {formatPnl(snap.totalPnlPct)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Refresh status — honest state display */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {lastRefreshAt ? (
            <p className="text-xs text-[var(--color-muted)]">
              最后更新：{formatTime(lastRefreshAt)}
            </p>
          ) : (
            <p className="text-xs text-[var(--color-muted)]">尚未刷新</p>
          )}
          <span className={`rounded-full border px-2 py-0.5 text-xs ${statusBadge(refreshStatus)}`}>
            {statusLabel(refreshStatus)}
          </span>
          {refreshStatus === "stale" && (
            <span className="text-xs text-amber-100/80">
              上次刷新超时，当前展示旧数据
            </span>
          )}
        </div>

        {/* Candidate pool info — transparent about source */}
        <div className="mt-3 rounded-[16px] border border-white/8 bg-black/15 px-4 py-2.5">
          <p className="text-xs text-[var(--color-muted)]">
            候选池来源：已持仓 + 用户评分沉淀（{poolInfo ? `${poolInfo.holdingsCount} 持仓 / ${poolInfo.scoredPoolCount} 已评分` : "暂无数据"}）
            <span className="ml-2 text-[var(--color-ink-soft)]">· 自动热门发现暂未接通</span>
          </p>
        </div>
      </section>

      {/* Equity chart */}
      <section className="mt-5 surface-card reveal-up px-6 py-6 md:px-7">
        <p className="section-kicker">净值曲线</p>
        <p className="mt-1 text-xs text-[var(--color-ink-soft)]">三种策略从 $100 起步的模拟净值变化</p>
        <div className="mt-4">
          <EquityChart points={equityPoints} />
        </div>
      </section>

      {/* Strategy cards */}
      <section className="mt-5 space-y-5">
        {(["gambler", "p-zi", "diamond"] as const).map((id) => {
          const snap = snapshots.find((s) => s.strategyId === id);
          if (!snap) {
            return (
              <div key={id} className="surface-card rounded-[28px] border border-white/10 px-6 py-6">
                <p className="text-sm text-[var(--color-muted)]">
                  {STRATEGY_META[id].emoji} {STRATEGY_META[id].desc.split("，")[0]} — 等待数据...
                </p>
              </div>
            );
          }
          return <StrategyCard key={id} snap={snap} />;
        })}
      </section>
    </main>
  );
}
