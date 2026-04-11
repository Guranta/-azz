type LevelBadgeProps = {
  label: string;
  emoji?: string;
  tone?: "love" | "neutral" | "warning" | "info";
};

const TONE_CLASS: Record<NonNullable<LevelBadgeProps["tone"]>, string> = {
  love: "border-amber-300/35 bg-amber-300/12 text-amber-100",
  neutral: "border-white/12 bg-white/6 text-[var(--color-ink-soft)]",
  warning: "border-rose-300/35 bg-rose-300/12 text-rose-100",
  info: "border-cyan-300/35 bg-cyan-300/12 text-cyan-100",
};

export function LevelBadge({
  label,
  emoji,
  tone = "love",
}: LevelBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.12em] ${TONE_CLASS[tone]}`}
    >
      {emoji ? <span aria-hidden="true">{emoji}</span> : null}
      <span>{label}</span>
    </span>
  );
}
