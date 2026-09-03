'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export function MiniBarChart({
  data,
  className,
  barClassName,
}: {
  data: { label: string; value: number }[];
  className?: string;
  barClassName?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className={cn('flex items-end gap-2 sm:gap-3', className)}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        const active = hover === i;
        return (
          <div
            key={d.label}
            className="flex flex-1 flex-col items-center gap-2"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="relative flex h-28 w-full items-end justify-center">
              {active && (
                <div className="absolute -top-7 z-10 whitespace-nowrap rounded-md bg-foreground px-2 py-1 font-figures text-[11px] font-semibold text-background shadow">
                  {d.value.toLocaleString()}
                </div>
              )}
              <div
                className={cn(
                  'w-full max-w-8 rounded-t-md bg-primary/25 transition-all duration-300',
                  active && 'bg-primary',
                  barClassName
                )}
                style={{ height: `${Math.max(4, pct)}%` }}
              />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
