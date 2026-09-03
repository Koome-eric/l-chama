import { CountUp } from '@/components/motion/CountUp';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export function StatCard({
  label,
  value,
  format,
  icon: Icon,
  tone = 'primary',
  trend,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  icon: LucideIcon;
  tone?: 'primary' | 'gold' | 'chama' | 'destructive';
  trend?: number; // signed percentage
  suffix?: string;
  hint?: string;
}) {
  const toneClasses: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    gold: 'bg-gold/15 text-gold',
    chama: 'bg-chama/10 text-chama',
    destructive: 'bg-destructive/10 text-destructive',
  };

  const positive = (trend ?? 0) >= 0;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={cn(
          'pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition-opacity opacity-60 group-hover:opacity-90',
          toneClasses[tone].split(' ')[0]
        )}
      />
      <div className="relative flex items-start justify-between">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        {trend !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
              positive ? 'bg-chama/10 text-chama' : 'bg-destructive/10 text-destructive'
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="relative mt-4 text-sm font-medium text-muted-foreground">{label}</p>
      <p className="relative mt-1 font-figures text-2xl font-bold tracking-tight">
        <CountUp value={value} format={format} />
        {suffix}
      </p>
      {hint && <p className="relative mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
