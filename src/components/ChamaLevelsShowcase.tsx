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
  'from-cyan-400/40 to-cyan-500/40',
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

// Continuous marquee: the level list is rendered twice back-to-back in one
// flex track, which scrolls via a plain CSS animation (translateX 0 → -50%,
// linear, infinite). With two identical copies the loop point is invisible.
// Hovering the row pauses it (animation-play-state), and the global
// prefers-reduced-motion rule in globals.css already freezes all
// animations, so this respects that automatically.
export function ChamaLevelsShowcase() {
  const doubled = [...CHAMA_LEVELS, ...CHAMA_LEVELS];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="group/marquee overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]"
    >
      <div className="flex w-max gap-4 animate-marquee group-hover/marquee:[animation-play-state:paused]">
        {doubled.map((level, i) => (
          <div key={`${level.key}-${i}`} className="group/card relative shrink-0 w-[190px] sm:w-[210px]">
            <div
              className={`absolute -inset-px rounded-3xl bg-gradient-to-br ${TIER_ACCENT[i % TIER_ACCENT.length]} opacity-0 group-hover/card:opacity-100 blur-sm transition-opacity duration-300`}
            />
            <div className="relative rounded-3xl border border-border/60 bg-card px-6 py-8 text-center transition-colors duration-300 group-hover/card:border-transparent">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {level.name}
              </p>
              <p className="mt-3 font-figures text-3xl font-bold font-headline">
                <span className="text-sm font-normal text-muted-foreground mr-0.5">KES</span>
                {formatCompact(level.monthlyAmount)}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Minimum {level.groupSize} members</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
