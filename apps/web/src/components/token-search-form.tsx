"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const DEFAULT_TOKEN_ADDRESS = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";
const DEFAULT_WALLET_ADDRESS = "0x2a1c7bc7e697f6bff5ae9122c5b0212fe5ac42aa";

const MODE_LABELS = {
  token: {
    title: "Paste one BSC token contract and open the token report.",
    description:
      "Token mode keeps the live V1 route shape and opens /token/[address].",
    label: "BSC Token Address",
    placeholder: "Paste a BSC token contract address",
    sample: DEFAULT_TOKEN_ADDRESS,
    submitLabel: "Open Token Report",
    routeHint: "/token/[address]",
    signals: [
      "live token scoring",
      "tracked-address scoring",
      "MiniMax server refinement",
    ],
  },
  address: {
    title: "看这个钱包是畜生、P子还是钻石手。",
    description:
      "Address mode opens /address/[address] and answers one thing first: 看这个钱包是畜生、P子还是钻石手，再补充 recent meme behavior、launchpad bias 和画像证据。",
    label: "BSC Wallet Address",
    placeholder: "Paste a BSC wallet address",
    sample: DEFAULT_WALLET_ADDRESS,
    submitLabel: "Open Wallet Profile",
    routeHint: "/address/[address]",
    signals: [
      "畜生 / P子 / 钻石手",
      "launchpad bias",
      "recent meme activity",
    ],
  },
} as const;

export function TokenSearchForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"token" | "address">("token");
  const [tokenAddress, setTokenAddress] = useState(DEFAULT_TOKEN_ADDRESS);
  const [walletAddress, setWalletAddress] = useState(DEFAULT_WALLET_ADDRESS);

  const modeConfig = MODE_LABELS[mode];
  const currentValue = mode === "token" ? tokenAddress : walletAddress;

  const setCurrentValue = (value: string) => {
    if (mode === "token") {
      setTokenAddress(value);
      return;
    }

    setWalletAddress(value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = currentValue.trim();
    if (!trimmed) {
      return;
    }

    router.push(mode === "token" ? `/token/${trimmed}` : `/address/${trimmed}`);
  };

  return (
    <form
      className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_100%)] p-5 shadow-[0_30px_90px_rgba(2,8,22,0.34)] backdrop-blur"
      onSubmit={handleSubmit}
    >
      <div className="pointer-events-none absolute right-[-12%] top-[-18%] h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(244,199,106,0.28)_0%,transparent_70%)] blur-3xl" />
      <div className="relative">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="section-kicker text-[var(--color-accent)]">Search Entry</p>
            <h3 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)] md:text-4xl">
              {modeConfig.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)] md:text-base">
              {modeConfig.description}{" "}
              <span className="font-mono text-[var(--color-ink)]">
                {modeConfig.routeHint}
              </span>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border border-white/10 bg-white/5 p-1">
              {(["token", "address"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    mode === item
                      ? "bg-[linear-gradient(135deg,#f4c76a_0%,#ff9b62_100%)] font-semibold text-[var(--color-accent-ink)]"
                      : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {item === "token" ? "Token" : "Address"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCurrentValue(modeConfig.sample)}
              className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:border-white/20 hover:bg-white/10"
            >
              Use Sample
            </button>
            <Link
              href="/tech"
              className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-[var(--color-ink-soft)] transition hover:border-white/18 hover:text-[var(--color-ink)]"
            >
              View Tech
            </Link>
          </div>
        </div>

        <label
          className="mt-6 block text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-muted)]"
          htmlFor="search-address"
        >
          {modeConfig.label}
        </label>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="rounded-[24px] border border-white/10 bg-[var(--color-panel-strong)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <input
              id="search-address"
              name={mode === "token" ? "tokenAddress" : "address"}
              value={currentValue}
              onChange={(event) => setCurrentValue(event.target.value)}
              className="w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-4 text-sm text-[var(--color-ink)] outline-none transition focus:border-white/20 placeholder:text-[var(--color-muted)]"
              placeholder={modeConfig.placeholder}
              autoComplete="off"
              spellCheck={false}
            />
            <div className="mt-3 flex flex-col gap-2 text-xs leading-6 text-[var(--color-muted)] sm:flex-row sm:items-center sm:justify-between">
              <span>
                Requests go through the live website API and keep token scoring and
                address profiling on separate routes.
              </span>
              <span className="font-mono text-[11px] text-[var(--color-ink-soft)]">
                {modeConfig.sample}
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="rounded-[24px] bg-[linear-gradient(135deg,#f4c76a_0%,#ff9b62_100%)] px-7 py-4 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[0_18px_40px_rgba(244,199,106,0.26)] transition hover:-translate-y-0.5 hover:brightness-105"
          >
            {modeConfig.submitLabel}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {modeConfig.signals.map((signal) => (
            <span
              key={signal}
              className="metric-pill border-white/10 bg-white/5 text-[var(--color-ink-soft)]"
            >
              {signal}
            </span>
          ))}
        </div>
      </div>
    </form>
  );
}
