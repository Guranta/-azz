"use client";

import type { StrategyEquityPoint } from "@meme-affinity/core";

type EquityChartProps = {
  points: StrategyEquityPoint[];
};

const STRATEGY_COLORS: Record<string, string> = {
  gambler: "#f87171",   // rose-400
  "p-zi": "#67e8f9",    // cyan-300
  diamond: "#6ee7b7",   // emerald-300
};

const STRATEGY_LABELS: Record<string, string> = {
  gambler: "赌狗",
  "p-zi": "P子",
  diamond: "钻石手",
};

const CHART_W = 720;
const CHART_H = 260;
const PAD_L = 50;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 36;
const PLOT_W = CHART_W - PAD_L - PAD_R;
const PLOT_H = CHART_H - PAD_T - PAD_B;

export function EquityChart({ points }: EquityChartProps) {
  if (!points || points.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-[var(--color-muted)]">
        暂无净值数据
      </div>
    );
  }

  // Group by strategy
  const grouped = new Map<string, StrategyEquityPoint[]>();
  for (const p of points) {
    const arr = grouped.get(p.strategyId) ?? [];
    arr.push(p);
    grouped.set(p.strategyId, arr);
  }

  // Sort each group by time
  for (const [, arr] of grouped) {
    arr.sort((a, b) => new Date(a.pointAt).getTime() - new Date(b.pointAt).getTime());
  }

  // Compute global min/max
  const allEquities = points.map((p) => p.equityUsd);
  let minEq = Math.min(...allEquities);
  let maxEq = Math.max(...allEquities);
  // Add some padding
  const range = maxEq - minEq || 1;
  minEq = Math.max(0, minEq - range * 0.05);
  maxEq = maxEq + range * 0.05;

  // Compute global time range
  const allTimes = points.map((p) => new Date(p.pointAt).getTime());
  const minT = Math.min(...allTimes);
  const maxT = Math.max(...allTimes);
  const tRange = maxT - minT || 1;

  function scaleX(t: number): number {
    return PAD_L + ((t - minT) / tRange) * PLOT_W;
  }
  function scaleY(v: number): number {
    return PAD_T + PLOT_H - ((v - minEq) / (maxEq - minEq)) * PLOT_H;
  }

  // Build path data for each strategy
  const paths: { strategyId: string; d: string }[] = [];
  for (const [id, arr] of grouped) {
    if (arr.length === 0) continue;
    const d = arr
      .map((p, i) => {
        const x = scaleX(new Date(p.pointAt).getTime());
        const y = scaleY(p.equityUsd);
        return i === 0 ? `M${x},${y}` : `L${x},${y}`;
      })
      .join(" ");
    paths.push({ strategyId: id, d });
  }

  // Y-axis ticks
  const yTicks = 5;
  const yTickValues: number[] = [];
  for (let i = 0; i <= yTicks; i++) {
    yTickValues.push(minEq + ((maxEq - minEq) * i) / yTicks);
  }

  // X-axis labels — show up to 4 time labels
  const xLabelCount = Math.min(4, points.length);
  const xLabelValues: number[] = [];
  for (let i = 0; i < xLabelCount; i++) {
    xLabelValues.push(minT + (tRange * i) / (xLabelCount - 1 || 1));
  }

  function formatUsd(v: number): string {
    return `$${v.toFixed(0)}`;
  }

  function formatTime(ts: number): string {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full min-w-[480px]"
        style={{ maxHeight: 260 }}
      >
        {/* Grid lines */}
        {yTickValues.map((v) => (
          <line
            key={`grid-${v}`}
            x1={PAD_L}
            y1={scaleY(v)}
            x2={PAD_L + PLOT_W}
            y2={scaleY(v)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        ))}

        {/* Y-axis labels */}
        {yTickValues.map((v) => (
          <text
            key={`ylabel-${v}`}
            x={PAD_L - 6}
            y={scaleY(v) + 4}
            textAnchor="end"
            fill="var(--color-muted)"
            fontSize={10}
            fontFamily="monospace"
          >
            {formatUsd(v)}
          </text>
        ))}

        {/* X-axis labels */}
        {xLabelValues.map((ts) => (
          <text
            key={`xlabel-${ts}`}
            x={scaleX(ts)}
            y={CHART_H - 6}
            textAnchor="middle"
            fill="var(--color-muted)"
            fontSize={10}
            fontFamily="monospace"
          >
            {formatTime(ts)}
          </text>
        ))}

        {/* Baseline at $100 */}
        {minEq <= 100 && maxEq >= 100 && (
          <line
            x1={PAD_L}
            y1={scaleY(100)}
            x2={PAD_L + PLOT_W}
            y2={scaleY(100)}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        )}

        {/* Equity curves */}
        {paths.map(({ strategyId, d }) => (
          <path
            key={strategyId}
            d={d}
            fill="none"
            stroke={STRATEGY_COLORS[strategyId] ?? "#ffffff"}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
        {paths.map(({ strategyId }) => (
          <div key={strategyId} className="flex items-center gap-2">
            <span
              className="inline-block h-0.5 w-4 rounded"
              style={{ backgroundColor: STRATEGY_COLORS[strategyId] ?? "#fff" }}
            />
            <span className="text-xs text-[var(--color-ink-soft)]">
              {STRATEGY_LABELS[strategyId] ?? strategyId}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
