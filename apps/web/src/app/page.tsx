import Link from "next/link";
import { LogoBadge } from "@/components/logo-badge";
import { ScoreBar } from "@/components/score-bar";
import { SiteNav } from "@/components/site-nav";
import { SponsorSurface } from "@/components/sponsor-surface";
import { TokenSearchForm } from "@/components/token-search-form";
import {
  getEnabledPersonas,
  getEnabledTrackedAddresses,
} from "@/lib/project-config";
import { createMetricsRecorder } from "@/lib/runtime-metrics";

function getAveMetricsSnapshot() {
  try {
    const recorder = createMetricsRecorder();
    return recorder.getSnapshot();
  } catch {
    return null;
  }
}

const SAMPLE_TOKEN_ADDRESS = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";
const SAMPLE_WALLET_ADDRESS = "0x2a1c7bc7e697f6bff5ae9122c5b0212fe5ac42aa";

const FEATURE_RAIL = [
  {
    title: "人物先开口",
    copy: "首页不是行情墙，而是先告诉你：这枚币在公开人物视角里，到底偏不偏爱。",
  },
  {
    title: "固定地址观察席",
    copy: "固定地址会按名称、logo、鲸鱼命中和买入倾向排出来，方便你一眼扫重点。",
  },
  {
    title: "聪明钱热度层",
    copy: "我们不只讲故事，还会把 top100 和 smart wallet overlap 摆出来，让热度更像证据。",
  },
];

const POSTER_SIGNALS = [
  "🧪 Meme Lab",
  "📗 Live V1",
  "🐳 Whale-aware",
  "🤖 MiniMax on server",
];

export default function Home() {
  const enabledPersonas = getEnabledPersonas();
  const enabledTrackedAddresses = getEnabledTrackedAddresses();

  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-6 md:px-10 md:py-8">
      <SiteNav current="home" ctaHref="/tech" ctaLabel="打开技术说明" />

      <section className="surface-card-strong poster-enter relative overflow-hidden px-6 py-8 md:px-8 md:py-10">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-35" />
        <div className="pointer-events-none absolute inset-y-0 right-[-8%] w-[36rem] bg-[radial-gradient(circle_at_center,rgba(122,215,255,0.16)_0%,transparent_60%)] blur-3xl" />
        <div className="pointer-events-none absolute left-[-6%] top-[-18%] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(244,199,106,0.28)_0%,transparent_70%)] blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1.08fr_0.92fr] xl:items-stretch">
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                {POSTER_SIGNALS.map((item) => (
                  <span key={item} className="metric-pill">
                    {item}
                  </span>
                ))}
              </div>

              <p className="section-kicker mt-6 text-[var(--color-accent)]">
                爱赵赵 / Meme Affinity Lab
              </p>
              <div className="mt-4">
                <p className="brand-wordmark text-[var(--color-ink)] text-glow">
                  爱赵赵
                </p>
                <p className="mt-2 text-sm uppercase tracking-[0.28em] text-[var(--color-accent)]">
                  BSC Meme Affinity Scanner
                </p>
              </div>
              <h1 className="poster-title mt-6 max-w-4xl font-semibold text-[var(--color-ink)]">
                一眼看懂，这枚 BSC meme 币到底谁会爱。
              </h1>
              <p className="poster-copy mt-5 max-w-2xl text-[var(--color-ink-soft)]">
                贴一个合约地址，网站会把人物喜爱度、特定地址倾向、聪明钱热度和
                top100 鲸鱼状态整理成一份能直接拿去 demo 的现场报告。
              </p>
            </div>

            <div className="mt-8">
              <TokenSearchForm />
            </div>
          </div>

          <aside className="soft-panel reveal-up flex flex-col justify-between gap-5 rounded-[32px] p-6">
            <div>
              <p className="section-kicker">扫描结果会长这样</p>
              <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
                一次扫描，落下一份谁爱这枚币的现场报告。
              </h2>
            </div>

            <div className="space-y-5">
              <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
                      推荐通道
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                      人物 + 特定地址 + 聪明钱
                    </p>
                  </div>
                  <span className="rounded-full border border-amber-300/35 bg-amber-300/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-100">
                    观察 / 买入 / 强烈推荐
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  <ScoreBar label="人物热度" value={76} />
                  <ScoreBar
                    label="特定地址买入倾向"
                    value={72}
                    accent="linear-gradient(90deg, rgba(122,215,255,0.96) 0%, rgba(135,239,172,0.92) 100%)"
                  />
                  <ScoreBar
                    label="聪明钱确认度"
                    value={64}
                    accent="linear-gradient(90deg, rgba(244,199,106,0.92) 0%, rgba(255,155,98,0.96) 100%)"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                    公开人物
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <LogoBadge
                      logoKey={enabledPersonas[0]?.logoKey ?? "persona-cz"}
                      logoMode={enabledPersonas[0]?.logoMode}
                      label={enabledPersonas[0]?.label ?? "CZ"}
                    />
                    <div>
                      <p className="text-lg font-semibold text-[var(--color-ink)]">
                        {enabledPersonas.length} active
                      </p>
                      <p className="text-sm leading-7 text-[var(--color-ink-soft)]">
                        V1 先只保留一个公开人物，让 demo 的判断线更清楚。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                    固定观察地址
                  </p>
                  <p className="mt-4 text-lg font-semibold text-[var(--color-ink)]">
                    {enabledTrackedAddresses.length} watchers
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[var(--color-ink-soft)]">
                    每个地址都会带名称、logo、鲸鱼状态和最近交易倾向。
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                站内入口
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["/", "/token/[address]", "/address/[address]", "/tech"].map((route) => (
                  <span
                    key={route}
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-1 font-mono text-xs text-[var(--color-ink)]"
                  >
                    {route}
                  </span>
                ))}
              </div>
              <Link
                href={`/token/${SAMPLE_TOKEN_ADDRESS}`}
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)] transition hover:text-[var(--color-ink)]"
              >
                打开示例结果页
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href={`/address/${SAMPLE_WALLET_ADDRESS}`}
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)] transition hover:text-[var(--color-ink)]"
              >
                打开地址示例结果页
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <article className="surface-card reveal-up px-6 py-7 md:px-7">
          <p className="section-kicker">为什么这个首页够 demo</p>
          <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            它看起来像产品海报，不像临时拼出来的查币表单。
          </h2>
          <div className="mt-6 space-y-4">
            {FEATURE_RAIL.map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-white/10 bg-black/20 px-5 py-5"
              >
                <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[var(--color-ink-soft)]">
                  {item.copy}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card reveal-up px-6 py-7 md:px-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">技术页入口</p>
              <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
                给评委看的技术说明，也要像产品的一部分。
              </h2>
            </div>
            <Link
              href="/tech"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-ink)] transition hover:border-white/18 hover:bg-white/10"
            >
              打开 /tech
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              [
                "Product flow",
                "从代币输入，到人物、特定地址、聪明钱和建议聚合，一条线讲清楚。",
              ],
              [
                "Why top100 first",
                "因为它是鲸鱼可见度的第一道闸门，能决定后面怎么解释地址和聪明钱结果。",
              ],
              [
                "AVE accounting",
                "冷路径是 4 + N，热路径是 3 + N，smart wallet list 会单独做服务端缓存。",
              ],
              [
                "Safe by design",
                "AVE 和 MiniMax 都只在服务端调用，浏览器和 skill 都拿不到密钥。",
              ],
            ].map(([title, copy]) => (
              <div
                key={title}
                className="rounded-[24px] border border-white/10 bg-[var(--color-panel-strong)] p-5"
              >
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-accent)]">
                  {title}
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
                  {copy}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <SponsorSurface />

      <section className="mt-8 rounded-[24px] border border-white/10 bg-black/20 px-6 py-5 text-center">
        <p className="text-sm text-[var(--color-muted)]">
          AVE API 已调用 <span className="font-semibold text-[var(--color-accent)]">{getAveMetricsSnapshot()?.totalCount ?? 0}</span> 次
          <span className="mx-2">·</span>
          每 1 小时更新一次
        </p>
      </section>
    </main>
  );
}
