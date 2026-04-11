"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useCallback } from "react";

type QueryCardProps = {
  mode: "token" | "address";
  title: string;
  placeholder: string;
};

export function QueryCard({ mode, title, placeholder }: QueryCardProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [navigating, setNavigating] = useState(false);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = query.trim();
      if (!trimmed || navigating) return;

      setNavigating(true);
      const destination =
        mode === "token"
          ? `/token/${encodeURIComponent(trimmed)}`
          : `/address/${encodeURIComponent(trimmed)}`;

      setTimeout(() => {
        router.push(destination);
      }, 200);
    },
    [query, mode, router, navigating],
  );

  const isToken = mode === "token";

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative overflow-hidden rounded-[28px] border backdrop-blur-[18px] ${
        isToken
          ? "border-white/12 bg-[linear-gradient(135deg,rgba(14,27,47,0.96)_0%,rgba(7,13,24,0.92)_52%,rgba(10,23,40,0.88)_100%)] shadow-[0_42px_140px_rgba(1,5,16,0.56)]"
          : "border-white/8 bg-[linear-gradient(180deg,rgba(13,23,40,0.86)_0%,rgba(8,15,28,0.8)_100%)] shadow-[0_24px_80px_rgba(1,5,16,0.32)]"
      }`}
    >
      {/* Decorative glow blobs — token card only */}
      {isToken && (
        <>
          <div className="pointer-events-none absolute left-[-6%] top-[-16%] h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(244,199,106,0.22)_0%,transparent_70%)] blur-3xl" />
          <div className="pointer-events-none absolute right-[-6%] bottom-[-20%] h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(122,215,255,0.18)_0%,transparent_70%)] blur-3xl" />
        </>
      )}

      <div className="relative px-6 py-8 md:px-10 md:py-10">
        <h2
          className={`display-copy font-semibold tracking-tight text-[var(--color-ink)] ${
            isToken ? "text-2xl md:text-3xl" : "text-lg md:text-xl"
          }`}
        >
          {title}
        </h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-[var(--color-ink)] outline-none transition-colors duration-200 focus:border-white/22 placeholder:text-[var(--color-muted)]"
            placeholder={placeholder}
            aria-label={placeholder}
            autoComplete="off"
            spellCheck={false}
            disabled={navigating}
          />

          <button
            type="submit"
            disabled={navigating}
            className={[
              "flex items-center justify-center rounded-[20px] px-7 py-3.5 text-sm font-semibold transition-all duration-200",
              "bg-[linear-gradient(135deg,#f4c76a_0%,#ff9b62_100%)] text-[var(--color-accent-ink)]",
              "shadow-[0_14px_34px_rgba(244,199,106,0.24)]",
              "hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_18px_42px_rgba(244,199,106,0.32)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-solid)]",
              "active:scale-[0.94] active:brightness-110",
            ].join(" ")}
          >
            {"\u5f00\u67e5"}
          </button>
        </div>
      </div>

      {/* ── Waiting overlay ── */}
      {navigating && (
        <div className="waiting-overlay absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[inherit] backdrop-blur-[8px]">
          {/* Ambient glow */}
          <div className="pointer-events-none absolute left-[18%] top-[-8%] h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(244,199,106,0.22)_0%,transparent_70%)] blur-2xl" />
          <div className="pointer-events-none absolute bottom-[-6%] right-[16%] h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(122,215,255,0.16)_0%,transparent_70%)] blur-2xl" />

          <div className="relative text-center">
            <div className="loading-ring mx-auto mb-6 h-14 w-14">
              <div className="loading-ring-track" />
              <div className="loading-ring-fill" />
            </div>

            <p className="display-copy text-xl font-semibold tracking-tight text-[var(--color-ink)]">
              {isToken ? "AI\u5206\u6790\u4e2d" : "\u5730\u5740\u753b\u50cf\u751f\u6210\u4e2d"}
            </p>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
              {"\u9884\u8ba1\u9700\u8981 1 \u5206\u949f"}
            </p>
          </div>
        </div>
      )}
    </form>
  );
}
