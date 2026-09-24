'use client';

import { Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

/**
 * Sun / moon toggle switch for the navbar. A pill-shaped track with a
 * sliding thumb — the thumb icon rotates/cross-fades between sun and moon
 * on switch so it reads as a deliberate, premium interaction rather than a
 * plain checkbox.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex h-8 w-[3.25rem] shrink-0 items-center rounded-full border transition-colors duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isDark
          ? 'border-primary/30 bg-gradient-to-r from-[hsl(222,32%,15%)] to-[hsl(222,32%,9%)] shadow-inner'
          : 'border-border bg-gradient-to-r from-sky-100 via-sky-50 to-amber-50 shadow-inner',
        className
      )}
    >
      <Sun
        aria-hidden
        className={cn(
          'absolute left-[7px] h-3.5 w-3.5 transition-opacity duration-300',
          isDark ? 'opacity-0' : 'text-amber-500 opacity-70'
        )}
      />
      <Moon
        aria-hidden
        className={cn(
          'absolute right-[7px] h-3.5 w-3.5 transition-opacity duration-300',
          isDark ? 'text-primary opacity-80' : 'opacity-0'
        )}
      />

      <motion.span
        aria-hidden
        animate={{ x: isDark ? 24 : 2 }}
        transition={{ type: 'spring', stiffness: 480, damping: 30 }}
        className={cn(
          'absolute top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full',
          isDark ? 'bg-primary text-primary-foreground shadow-md shadow-primary/40' : 'bg-white text-amber-500 shadow-md shadow-amber-900/10'
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span
              key="moon"
              initial={{ rotate: -70, opacity: 0, scale: 0.4 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 70, opacity: 0, scale: 0.4 }}
              transition={{ duration: 0.18 }}
              className="flex items-center justify-center"
            >
              <Moon className="h-3.5 w-3.5" fill="currentColor" />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ rotate: 70, opacity: 0, scale: 0.4 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -70, opacity: 0, scale: 0.4 }}
              transition={{ duration: 0.18 }}
              className="flex items-center justify-center"
            >
              <Sun className="h-3.5 w-3.5" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </button>
  );
}
