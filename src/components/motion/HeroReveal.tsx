'use client';

import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

// The single orchestrated entrance for the landing hero: eyebrow, headline,
// subtext, CTAs, and the hero photo stagger in one deliberate sequence on
// first load. This is the one non-user-triggered motion moment on the page —
// everything else animates only in response to what someone does.
const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.11, delayChildren: 0.05 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export function HeroReveal({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function HeroRevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={item} className={className}>
      {children}
    </motion.div>
  );
}
