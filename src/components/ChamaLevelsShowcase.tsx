'use client';

import { motion } from 'framer-motion';
import { CHAMA_LEVELS } from '@/lib/chama-levels';

// Ascending accent per tier — subtle slate at the low end, warming into
// gold at the top, so the row itself reads as a ladder without needing
// a chart. Kept to CSS gradients (no images/new deps).
const TIER_ACCENT = [
  'from-slate-400/40 to-slate-500/40',
  'from-sky-400/40 to-sky-500/40',
  'from-teal-400/40 to-teal-500/40',
  'from-emerald-400/40 to-emerald-500/40',
  'from-primary/40 to-primary/60',
  'from-violet-400/40 to-violet-500/40',
  'from-fuchsia-400/40 to-fuchsia-500/40',
  'from-amber-400/50 to-amber-500/50',
  'from-gold/60 to-amber-400/60',
];

function formatCompact(amount: number) {
  if (amount >= 1000) return `${amount / 1000}K`;
  return String(amount);
}

export function ChamaLevelsShowcase() {
  return (
    <div
      className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-3 lg:grid-cols-9 sm:overflow-visible sm:pb-0 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {CHAMA_LEVELS.map((level, i) => (
        <motion.div
          key={level.key}
          initial={{ opacity: 0, y: 18, scale: 0.94 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 0.45, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -4, scale: 1.03 }}
          className="group relative shrink-0 w-[128px] sm:w-auto snap-start"
        >
          <div
            className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${TIER_ACCENT[i % TIER_ACCENT.length]} opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300`}
          />
          <div className="relative rounded-2xl border border-border/60 bg-card px-3.5 py-4 text-center transition-colors duration-300 group-hover:border-transparent">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {level.name}
            </p>
            <p className="mt-1.5 font-figures text-lg font-bold font-headline">
              <span className="text-xs font-normal text-muted-foreground mr-0.5">KES</span>
              {formatCompact(level.monthlyAmount)}
              <span className="text-xs font-normal text-muted-foreground">/mo</span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Up to {level.groupSize}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
