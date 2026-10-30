'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type NavLink = { href: string; label: string };

// Phone / tablet navigation. The desktop links in LChamaHeader are hidden
// below the xl breakpoint, so this is the only way to reach them on small
// screens. It is a simple disclosure panel: it closes on Escape, when a link
// is chosen, and whenever the route changes.
export function MobileNav({ links, isSignedIn }: { links: NavLink[]; isSignedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="xl:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b bg-background shadow-lg"
        >
          <div className="container mx-auto flex flex-col px-4 py-3">
            <ul className="divide-y">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={close}
                    className="flex min-h-12 items-center text-base font-medium text-foreground/90 hover:text-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-3 grid gap-2 border-t pt-4 pb-2 sm:grid-cols-2">
              {isSignedIn ? (
                <Button asChild className="sm:col-span-2">
                  <Link href="/panel" onClick={close}>My Chama</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="outline">
                    <Link href="/sign-in" onClick={close}>Sign in</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/start" onClick={close}>Start a chama</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
