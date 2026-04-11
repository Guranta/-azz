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

function formatStyleLabel(value: string) {
  const labels: Record<string, string> = {
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

  return labels[value] ?? value;
}

function normalizeArchetype(value: string): "畜生" | "P子" | "钻石手" | "数据不足" {
  const raw = String(value || "").trim();

  if (raw === "畜生" || raw.includes("鐣") || raw.includes("敓")) {
    return "畜生";
  }

  if (raw === "P子" || raw.includes("P") || raw.includes("瀛")) {
    return "P子";
  }

  if (raw === "钻石手" || raw.includes("閽") || raw.includes("钻")) {
    return "钻石手";
  }

  if (raw === "数据不足" || raw.includes("鏁版") || raw.includes("不足")) {
    return "数据不足";
  }

  return "数据不足";
}

function getArchetypeTone(archetype: "畜生" | "P子" | "钻石手" | "数据不足") {
  switch (archetype) {
    case "畜生":
      return "text-rose-100 drop-shadow-[0_0_28px_rgba(251,113,133,0.42)]";
    case "P子":
      return "text-cyan-100 drop-shadow-[0_0_28px_rgba(103,232,249,0.4)]";
    case "钻石手":
      return "text-emerald-100 drop-shadow-[0_0_28px_rgba(110,231,183,0.4)]";
    default:
      return "text-[var(--color-ink)] drop-shadow-[0_0_20px_rgba(255,255,255,0.18)]";
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
      error: "钱包画像生成失败，请检查地址是否正确。",
    };
  }

  return {
    data: payload,
    error: response.ok ? null : payload.errors?.[0] ?? "钱包画像生成失败，请稍后重试。",
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
          <p className="section-kicker text-[var(--color-accent)]">钱包画像暂不可用</p>
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
  const archetype = normalizeArchetype(String(profile.archetype));

  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-6 md:px-10 md:py-8">
      <SiteNav ctaHref="/" ctaLabel="再查一个" />

      <section className="surface-card-strong poster-enter relative overflow-hidden px-6 py-7 md:px-10 md:py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(244,199,106,0.16),transparent_45%),radial-gradient(circle_at_82%_78%,rgba(122,215,255,0.16),transparent_42%)]" />

        <div className="relative z-10">
          <p className="section-kicker text-[var(--color-accent)]">钱包地址</p>
          <p className="mt-3 break-all font-mono text-sm text-[var(--color-ink)] md:text-base">
            {data.address.address}
          </p>

          <div className="mt-8 flex min-h-[52vh] items-center justify-center">
            <h1
              className={`archetype-stage text-center text-7xl font-black tracking-[0.08em] md:text-[12rem] ${getArchetypeTone(
                archetype
              )}`}
            >
              {archetype}
            </h1>
          </div>

          <div className="mx-auto mt-2 flex max-w-4xl flex-wrap items-center justify-center gap-2">
            {profile.style.map((item) => (
              <span
                key={`style-${item}`}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs tracking-[0.16em] text-[var(--color-ink-soft)]"
              >
                {formatStyleLabel(item)}
              </span>
            ))}
            {profile.favoriteNarratives.map((item) => (
              <span
                key={`narrative-${item}`}
                className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs tracking-[0.16em] text-cyan-100"
              >
                {item}
              </span>
            ))}
          </div>

          {profile.summary ? (
            <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-7 text-[var(--color-ink-soft)]">
              {profile.summary}
            </p>
          ) : null}

          {profile.evidence.length > 0 ? (
            <div className="mx-auto mt-5 max-w-2xl">
              <div className="rounded-[20px] border border-white/8 bg-black/15 px-5 py-4">
                <ul className="space-y-2">
                  {profile.evidence.slice(0, 4).map((item) => (
                    <li
                      key={item}
                      className="text-xs leading-6 text-[var(--color-ink-soft)]"
                    >
                      · {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="mt-5 text-center text-xs text-amber-100/90">提示：{error}</p>
          ) : null}

          <p className="mt-8 text-center text-xs text-[var(--color-ink-soft)]">
            仅供参考，不构成任何交易建议。
          </p>
        </div>

        <style>{`
          .archetype-stage {
            animation: archetype-pulse 2.2s ease-in-out infinite,
              archetype-rise 0.9s ease-out both,
              archetype-shimmer 5.2s linear infinite;
            will-change: transform, filter, opacity;
          }

          @keyframes archetype-rise {
            0% {
              opacity: 0;
              transform: translateY(24px) scale(0.94);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes archetype-pulse {
            0%,
            100% {
              transform: scale(1);
              filter: saturate(1);
            }
            50% {
              transform: scale(1.04);
              filter: saturate(1.2);
            }
          }

          @keyframes archetype-shimmer {
            0% {
              letter-spacing: 0.05em;
            }
            50% {
              letter-spacing: 0.1em;
            }
            100% {
              letter-spacing: 0.05em;
            }
          }
        `}</style>
      </section>
    </main>
  );
}
