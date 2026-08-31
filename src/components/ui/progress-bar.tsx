'use client';

// Lightweight animated progress bar (no extra dependency) — used for the
// loan guarantee tracker, where the fill genuinely represents "how close
// is this to being funded," so the animation communicates real progress
// rather than decorating the page.
export function ProgressBar({
  value,
  max,
  className,
  indicatorClassName,
}: {
  value: number;
  max: number;
  className?: string;
  indicatorClassName?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-muted ${className ?? ''}`}>
      <div
        className={`h-full rounded-full bg-chama transition-[width] duration-700 ease-out ${indicatorClassName ?? ''}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
