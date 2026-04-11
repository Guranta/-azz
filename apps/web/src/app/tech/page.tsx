import { SiteNav } from "@/components/site-nav";
import { createMetricsRecorder } from "@/lib/runtime-metrics";

const TOP_BADGES = ["CZ", "\u806a\u660e\u94b1", "\u8f66\u5934"] as const;

const FLOW_STEPS = [
  "用户提交一个 BSC 代币合约地址。",
  "服务端从 AVE 获取代币详情与风险数据。",
  "服务端获取代币 Top100 持仓地址。",
  "服务端读取 24h 聪明钱快照，计算与 Top100 的交集。",
  "车头路径使用 frozen driver system 快照，对固定跟踪地址进行评分。",
  "服务端合并 CZ、车头、聪明钱三条通道，给出最终推荐。",
] as const;

const SCORE_CHANNELS = [
  {
    title: "\u5730\u5740\u67e5\u8be2\u8def\u5f84",
    copy: "地址输入至 /address/[address]，返回钱包画像。确定性规则 + MiniMax 60s 单次精炼，无重试。",
  },
  {
    title: "CZ \u8bc4\u5206",
    copy: "基于代币简介、发射平台、叙事标签和风险态度，构建 CZ 偏好评分。MiniMax 60s 封顶、无重试。",
  },
  {
    title: "\u8f66\u5934\u8bc4\u5206",
    copy: "使用 frozen driver system 快照评分跟踪地址。确定性规则先行，可选 MiniMax 精炼（60s 封顶、无重试）。",
  },
  {
    title: "\u806a\u660e\u94b1\u8bc4\u5206",
    copy: "计算代币 Top100 与聪明钱包快照的交集，给出聪明钱热度。",
  },
] as const;

function getAveMetricsSnapshot() {
  try {
    const recorder = createMetricsRecorder();
    return recorder.getSnapshot();
  } catch {
    return null;
  }
}

export default function TechPage() {
  const totalCount = getAveMetricsSnapshot()?.totalCount ?? 0;

  return (
    <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-6 md:px-10 md:py-8">
      <SiteNav current="tech" />

      <section className="surface-card-strong poster-enter px-6 py-10 md:px-10 md:py-12">
        <h1 className="poster-title font-semibold text-[var(--color-ink)]">
          {"\u6280\u672f\u8bf4\u660e"}
        </h1>
      </section>

      <section className="mt-6 flex flex-wrap gap-2">
        {TOP_BADGES.map((badge) => (
          <span
            key={badge}
            className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
          >
            {badge}
          </span>
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="surface-card reveal-up px-6 py-7 md:px-7">
          <p className="section-kicker">{"\u4ea7\u54c1\u4e3b\u6d41\u7a0b"}</p>
          <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            {"token \u8bc4\u5206\u600e\u4e48\u6765\u7684"}
          </h2>

          <div className="mt-6 space-y-4">
            {FLOW_STEPS.map((step, index) => (
              <div
                key={step}
                className="flex items-start gap-4 rounded-[24px] border border-white/10 bg-black/20 px-5 py-5"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/6 text-sm font-semibold text-[var(--color-accent)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-sm leading-7 text-[var(--color-ink-soft)]">{step}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card reveal-up px-6 py-7 md:px-7">
          <p className="section-kicker">{"\u8bc4\u5206\u901a\u9053"}</p>
          <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            {"\u56db\u6761\u8bc4\u5206\u901a\u9053"}
          </h2>

          <div className="mt-6 space-y-4">
            {SCORE_CHANNELS.map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-white/10 bg-[var(--color-panel-strong)] p-5"
              >
                <h3 className="text-lg font-semibold text-[var(--color-ink)]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">{item.copy}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="surface-card mt-8 reveal-up px-6 py-7 md:px-7">
        <p className="section-kicker">{"系统说明"}</p>
        <div className="mt-4 space-y-3">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">{"Frozen Driver System"}</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
              {"车头评分已从实时链上查询切换到 frozen driver system。三个固定跟踪地址（王小二、冷静、阿峰）的历史交易特征已预采集并冻结为静态快照，评分时直接使用快照数据，无需实时请求链上历史。"}
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">{"MiniMax 调用策略"}</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
              {"token 评分和地址画像的 MiniMax 调用均为 60s 单次等待、无重试。确定性规则先行计算，MiniMax 仅做精炼补充，超时或失败时自动回退到确定性结果。"}
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">{"V3 交易功能"}</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
              {"代币详情页保留 BSC 链上交易面板，支持 BNB/USDT 买入和卖出，包含授权、滑点控制和余额查询。自动跟单尚未实现，留待后续。"}
            </p>
          </div>
        </div>
      </section>

      <section className="surface-card mt-8 reveal-up px-6 py-7 md:px-7">
        <p className="section-kicker">{"AVE API \u771f\u5b9e\u7d2f\u8ba1\u8c03\u7528\u6b21\u6570"}</p>
        <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-8 text-center">
          <p className="text-5xl font-semibold text-[var(--color-accent)]">
            {totalCount.toLocaleString("zh-CN")}
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{"\u7d2f\u8ba1\u603b\u6b21\u6570"}</p>
        </div>
      </section>
    </main>
  );
}
