"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const SEARCH_PLACEHOLDER = "\u8f93\u5165\u4ee3\u5e01\u5408\u7ea6\u6216\u94b1\u5305\u5730\u5740";

export function TokenSearchForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    router.push(`/scan/${encodeURIComponent(trimmed)}`);
  };

  return (
    <form
      className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_100%)] p-4 shadow-[0_22px_60px_rgba(2,8,22,0.28)] backdrop-blur"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-4 text-sm text-[var(--color-ink)] outline-none transition focus:border-white/20 placeholder:text-[var(--color-muted)]"
          placeholder={SEARCH_PLACEHOLDER}
          aria-label={SEARCH_PLACEHOLDER}
          autoComplete="off"
          spellCheck={false}
        />

        <button
          type="submit"
          className="rounded-[20px] bg-[linear-gradient(135deg,#f4c76a_0%,#ff9b62_100%)] px-7 py-4 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[0_14px_34px_rgba(244,199,106,0.24)] transition hover:-translate-y-0.5 hover:brightness-105"
        >
          {"\u5f00\u67e5"}
        </button>
      </div>
    </form>
  );
}
