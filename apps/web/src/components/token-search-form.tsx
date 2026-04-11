"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useCallback } from "react";

/**
 * Shared query card with animated submit button.
 * - mode="token"  → navigates to /token/[query]
 * - mode="address" → navigates to /address/[query]
 */
type QueryCardProps = {
  mode: "token" | "address";
  title: string;
  placeholder: string;
};

export function QueryCard({ mode, title, placeholder }: QueryCardProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pressing, setPressing] = useState(false);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;

      setPressing(true);
      const destination =
        mode === "token"
          ? `/token/${encodeURIComponent(trimmed)}`
          : `/address/${encodeURIComponent(trimmed)}`;

      // Short delay so the press animation is visible (150-200ms)
      setTimeout(() => {
        router.push(destination);
      }, 180);
    },
    [query, mode, router],
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
      {/* Decorative glow blobs — only on token card */}
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
          />

          <button
            type="submit"
            disabled={pressing}
            className={[
              "flex items-center justify-center rounded-[20px] px-7 py-3.5 text-sm font-semibold transition-all duration-200",
              "bg-[linear-gradient(135deg,#f4c76a_0%,#ff9b62_100%)] text-[var(--color-accent-ink)]",
              "shadow-[0_14px_34px_rgba(244,199,106,0.24)]",
              "hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_18px_42px_rgba(244,199,106,0.32)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-solid)]",
              pressing
                ? "scale-[0.94] brightness-110 shadow-[0_6px_16px_rgba(244,199,106,0.36)]"
                : "active:scale-[0.94] active:brightness-110",
            ].join(" ")}
          >
            {"\u5f00\u67e5"}
          </button>
        </div>
      </div>
    </form>
  );
}
