type ScoreBarProps = {
  label: string;
  value: number;
  valueLabel?: string;
  accent?: string;
};

function clampScore(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export function ScoreBar({
  label,
  value,
  valueLabel,
  accent = "linear-gradient(90deg, rgba(241,199,106,0.98) 0%, rgba(122,215,255,0.92) 100%)",
}: ScoreBarProps) {
  const safeValue = clampScore(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-[var(--color-ink-soft)]">{label}</span>
        <span className="font-medium text-[var(--color-ink)]">
          {valueLabel ?? `${safeValue}/100`}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full shadow-[0_0_24px_rgba(241,199,106,0.34)] transition-[width] duration-500"
          style={{
            width: `${safeValue}%`,
            background: accent,
          }}
        />
      </div>
    </div>
  );
}
