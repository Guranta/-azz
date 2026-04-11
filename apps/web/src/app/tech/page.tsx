import Link from "next/link";
import { LevelBadge } from "@/components/level-badge";
import { SiteNav } from "@/components/site-nav";
import { getEnabledTrackedAddresses } from "@/lib/project-config";
import { createMetricsRecorder } from "@/lib/runtime-metrics";

function getAveMetricsSnapshot() {
  try {
    const recorder = createMetricsRecorder();
    return recorder.getSnapshot();
  } catch {
    return null;
  }
}

const FLOW_STEPS = [
  "用户输入一个 BSC 代币合约地址。",
  "网站先向 AVE 拉 token detail 和 risk。",
  "再拉这个代币的 top100 holders。",
  "聪明钱取 24 小时 snapshot，计算 top100 与 snapshot 的交集。",
  "对每个固定地址拉 token-scoped recent history（上限 100 笔）。",
  "只纳入 fourmeme / flap 发射的 meme 代币相关记录。",
  "服务端聚合人物评分、特定地址评分、聪明钱评分和买入建议。",
  "结果页只负责渲染 live contract，不重新定义评分语义。",
];

const AVE_CALLS = [
  "1 x token detail",
  "1 x risk",
  "1 x top100 holders",
  "1 x smart_wallet/list",
  "N x tracked address history",
];

const SECURITY_RULES = [
  "AVE 和 MiniMax 只在服务端调用。",
  "浏览器端不会拿到 provider key。",
  "上游鉴权失败会先脱敏，再返回给前端。",
  "如果 AVE 字段有波动，只能在 adapter 层吸收，不能污染页面契约。",
];

export default function TechPage() {
  const trackedAddressCount = getEnabledTrackedAddresses().length;

  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-6 md:px-10 md:py-8">
      <SiteNav current="tech" ctaHref="/" ctaLabel="返回首页" />

      <section className="surface-card-strong poster-enter relative overflow-hidden px-6 py-8 md:px-8 md:py-10">
        <div className="pointer-events-none absolute right-[-10%] top-[-16%] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(122,215,255,0.22)_0%,transparent_72%)] blur-3xl" />
        <div className="pointer-events-none absolute left-[-4%] bottom-[-18%] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(244,199,106,0.24)_0%,transparent_72%)] blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1.02fr_0.98fr]">
          <div>
            <p className="section-kicker text-[var(--color-accent)]">/tech</p>
            <h1 className="poster-title mt-4 max-w-4xl font-semibold text-[var(--color-ink)]">
              技术说明页，也要让人一眼看懂这套评分链路。
            </h1>
            <p className="poster-copy mt-5 max-w-2xl text-[var(--color-ink-soft)]">
              这页是给评委和协作者看的操作说明：我们调用了什么、为什么先查
              top100、人物和固定地址怎么打分、聪明钱怎么算，以及安全边界放在哪。
              当前公开面分成两条路：`/token/[address]` 保留完整评分链路，
              `/address/[address]` 只返回纯钱包画像。
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              <LevelBadge label="cold path = 4 + N" emoji="❄️" tone="info" />
              <LevelBadge label="warm path = 3 + N" emoji="🔥" tone="love" />
              <LevelBadge
                label={`${trackedAddressCount} 个固定地址`}
                emoji="🛰️"
                tone="neutral"
              />
            </div>
          </div>

          <aside className="soft-panel reveal-up rounded-[32px] p-6">
            <p className="section-kicker">AVE 调用口径</p>
            <div className="mt-5 space-y-3">
              {AVE_CALLS.map((item) => (
                <div
                  key={item}
                  className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 font-mono text-sm text-[var(--color-ink)]"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                精确计数
              </p>
              <p className="mt-3 text-lg font-semibold text-[var(--color-ink)]">
                cold path = 4 + N
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--color-ink-soft)]">
                token detail + risk + top100 holders + smart_wallet/list + N
                次 tracked address history。
              </p>

              <p className="mt-5 text-lg font-semibold text-[var(--color-ink)]">
                warm path = 3 + N
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--color-ink-soft)]">
                smart_wallet/list 命中服务端缓存后，整条请求会少一次上游调用。
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="surface-card reveal-up px-6 py-7 md:px-7">
          <p className="section-kicker">产品主流程</p>
          <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            Token 路径会从一个代币地址输入，走到三条评分通道。
          </h2>
          <div className="mt-6 space-y-4">
            {FLOW_STEPS.map((step, index) => (
              <div
                key={step}
                className="flex items-start gap-4 rounded-[24px] border border-white/10 bg-black/20 px-5 py-5"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/6 text-sm font-semibold text-[var(--color-accent)]">
                  0{index + 1}
                </span>
                <p className="text-sm leading-7 text-[var(--color-ink-soft)]">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card reveal-up px-6 py-7 md:px-7">
          <p className="section-kicker">评分通道</p>
          <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            这一栏只解释 token 完整评分页的各层结论。
          </h2>

          <div className="mt-6 space-y-4">
            <div className="rounded-[24px] border border-cyan-300/18 bg-cyan-300/8 p-5">
              <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                Address 路径
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
                Address 模式现在只生成纯钱包画像，包含 archetype、style、risk appetite、
                recent token context、summary 和 evidence，不再展示 CZ、smart-money
                或 fixed-address scores。
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[var(--color-panel-strong)] p-5">
              <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                人物评分
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
                人物评分会结合 token brief、launchpad、narrative tags 和 risk
                posture，生成一份带 emoji、logo、confidence、summary 和 evidence
                的 PersonaScore。
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[var(--color-panel-strong)] p-5">
              <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                固定地址评分
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
                每个固定地址都会读取 token-scoped recent history，再结合 top100
                鲸鱼状态、smart-wallet context 和服务端 MiniMax 最终判断，得出喜爱等级和买入倾向。
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[var(--color-panel-strong)] p-5">
              <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                聪明钱评分
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
                聪明钱来自 token top100 holders 和 24 小时 snapshot 的交集。
                命中 0 个 = 🙅 不爱，1-2 个 = ❤️ 爱，≥3 个 = 😍 爱爱。
                Snapshot 包含 top30 smart wallets（按 total profit 排序）。
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[var(--color-panel-strong)] p-5">
              <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                建议聚合
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
                Recommendation 是人物、固定地址和聪明钱三层的最终聚合，顶层只显示
                STRONG_BUY、BUY、WATCH 或 DO_NOT_BUY。
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
        <article className="surface-card reveal-up px-6 py-7 md:px-7">
          <p className="section-kicker">为什么先查 top100</p>
          <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            因为它是最快、最可靠的鲸鱼可见度入口。
          </h2>

          <div className="mt-6 space-y-4">
            {[
              "在固定地址 fan-out 之前，top100 能最快告诉页面：这枚币有没有鲸鱼可见度。",
              "它会给固定地址卡片补上明确的 whale 状态：holder emoji、top100 rank 和 supply percentage。",
              "聪明钱评分也要靠它，因为 smart money 不是另起一套模型，而是 top100 和 smart_wallet/list 的 overlap。",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[24px] border border-white/10 bg-black/20 px-5 py-5 text-sm leading-7 text-[var(--color-ink-soft)]"
              >
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card reveal-up px-6 py-7 md:px-7">
          <p className="section-kicker">安全边界</p>
          <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            哪些东西绝对不会出现在浏览器里。
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {SECURITY_RULES.map((item) => (
              <div
                key={item}
                className="rounded-[24px] border border-white/10 bg-[var(--color-panel-strong)] p-5 text-sm leading-7 text-[var(--color-ink-soft)]"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[24px] border border-cyan-300/18 bg-cyan-300/8 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-100">
              UI 契约规则
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
              网站 UI 只负责渲染已经审核过的 live response 字段，不会在前端重新定义分数语义，也不会直接调用 provider。
            </p>
          </div>
        </article>
      </section>

      <section className="mt-10 rounded-[32px] border border-white/10 bg-[rgba(8,16,30,0.72)] px-6 py-7 backdrop-blur md:px-7">
        <div className="mb-6">
          <p className="section-kicker">AVE API 真实累计调用次数</p>
          <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            页面显示每 1 小时刷新一次
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-center">
            <p className="text-4xl font-semibold text-[var(--color-accent)]">
              {getAveMetricsSnapshot()?.totalCount ?? 0}
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">累计总次数</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-center">
            <p className="text-2xl font-semibold text-[var(--color-ink)]">
              {getAveMetricsSnapshot()?.tokenDetailCount ?? 0}
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">token detail</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-center">
            <p className="text-2xl font-semibold text-[var(--color-ink)]">
              {getAveMetricsSnapshot()?.riskCount ?? 0}
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">risk</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-center">
            <p className="text-2xl font-semibold text-[var(--color-ink)]">
              {getAveMetricsSnapshot()?.top100Count ?? 0}
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">top100</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-center">
            <p className="text-2xl font-semibold text-[var(--color-ink)]">
              {getAveMetricsSnapshot()?.addressTxCount ?? 0}
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">address tx</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-center">
            <p className="text-2xl font-semibold text-[var(--color-ink)]">
              {getAveMetricsSnapshot()?.smartWalletListCount ?? 0}
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">smart wallet list</p>
          </div>
        </div>
        <div className="mt-6 rounded-[24px] border border-amber-300/20 bg-amber-300/10 p-5">
          <p className="text-sm leading-7 text-[var(--color-ink-soft)]">
            <span className="font-semibold text-[var(--color-ink)]">设计口径说明：</span>
            实时查询 3 + N（冷路径 4 + N）。聪明钱日更单独统计，不占用实时额度。
            页面显示为真实累计值，每 1 小时刷新一次。
          </p>
        </div>
        <div className="mt-4 rounded-[24px] border border-cyan-300/20 bg-cyan-300/10 p-5">
          <p className="text-sm leading-7 text-[var(--color-ink-soft)]">
            <span className="font-semibold text-[var(--color-ink)]">聪明钱 24 小时 snapshot：</span>
            聪明钱不再在每次查币时重跑全量分析。服务端会按需重建 24 小时 snapshot，
            包含 top30 smart wallets（按 total profit 排序）及其最近 30 笔历史。
            单次查币只做 token top100 holders 与 snapshot 的交集计算。
          </p>
        </div>
      </section>

      <section className="mt-10 rounded-[32px] border border-white/10 bg-[rgba(8,16,30,0.72)] px-6 py-7 backdrop-blur md:px-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="section-kicker">返回主站</p>
            <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
              先把逻辑看明白，再回首页跑真正的扫描。
            </h2>
          </div>
          <Link
            href="/"
            className="rounded-full bg-[linear-gradient(135deg,#f4c76a_0%,#ff9b62_100%)] px-5 py-3 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[0_18px_40px_rgba(244,199,106,0.24)] transition hover:-translate-y-0.5"
          >
            打开首页
          </Link>
        </div>
      </section>
    </main>
  );
}
