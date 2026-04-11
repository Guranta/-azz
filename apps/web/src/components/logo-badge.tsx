type LogoBadgeProps = {
  logoKey: string;
  logoMode?: "emoji" | "asset";
  label: string;
  size?: "sm" | "md" | "lg";
};

const LOGO_MAP: Record<
  string,
  {
    emoji: string;
    short: string;
    tone: string;
  }
> = {
  "persona-cz": {
    emoji: "👑",
    short: "CZ",
    tone: "from-amber-300/90 via-orange-300/90 to-pink-300/90",
  },
  "wallet-sprinter": {
    emoji: "⚡",
    short: "LS",
    tone: "from-cyan-300/90 via-sky-300/90 to-blue-400/90",
  },
  "wallet-whale": {
    emoji: "🐳",
    short: "WS",
    tone: "from-emerald-300/90 via-cyan-300/90 to-sky-400/90",
  },
  "wallet-rotator": {
    emoji: "🌀",
    short: "NR",
    tone: "from-fuchsia-300/90 via-pink-300/90 to-orange-300/90",
  },
  "wallet-conviction": {
    emoji: "💎",
    short: "CS",
    tone: "from-lime-300/90 via-emerald-300/90 to-cyan-400/90",
  },
  "sponsor-ave": {
    emoji: "🛰️",
    short: "AV",
    tone: "from-cyan-300/90 via-sky-300/90 to-indigo-400/90",
  },
  "sponsor-minimax": {
    emoji: "🤖",
    short: "MM",
    tone: "from-amber-300/90 via-yellow-300/90 to-orange-300/90",
  },
  "sponsor-bnb": {
    emoji: "🟡",
    short: "BN",
    tone: "from-yellow-300/90 via-amber-300/90 to-orange-300/90",
  },
};

function getInitials(label: string): string {
  return label
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

export function LogoBadge({
  logoKey,
  logoMode = "asset",
  label,
  size = "md",
}: LogoBadgeProps) {
  const meta = LOGO_MAP[logoKey] ?? {
    emoji: "✨",
    short: getInitials(label),
    tone: "from-slate-200/90 via-sky-300/90 to-amber-300/90",
  };
  const sizeClass =
    size === "sm"
      ? "h-10 w-10 rounded-2xl text-sm"
      : size === "lg"
        ? "h-16 w-16 rounded-[24px] text-xl"
        : "h-12 w-12 rounded-[20px] text-base";

  return (
    <div
      className={`relative grid shrink-0 place-items-center border border-white/12 bg-[var(--color-panel-strong)] ${sizeClass}`}
    >
      <div
        className={`absolute inset-[2px] rounded-[inherit] bg-gradient-to-br ${meta.tone} opacity-95`}
      />
      <div className="absolute inset-[3px] rounded-[inherit] bg-[var(--color-panel-strong)]/88" />
      <span className="relative z-10 flex items-center gap-1 font-semibold text-[var(--color-ink)]">
        <span aria-hidden="true">{meta.emoji}</span>
        <span
          className={logoMode === "emoji" ? "hidden" : "text-[0.72em] tracking-[0.16em]"}
        >
          {meta.short}
        </span>
      </span>
    </div>
  );
}
