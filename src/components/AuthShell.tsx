import Link from 'next/link';
import Image from 'next/image';
import { Check } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

type Props = {
  /** What this screen is for, in the brand panel's voice. */
  headline: string;
  subline: string;
  children: React.ReactNode;
};

const PROMISES = [
  'Every contribution and repayment on one shared ledger',
  'Loans guaranteed by members of your own chama',
  'Your chama’s data is never visible to another chama',
];

// Shared frame for sign-in and sign-up. The left panel carries the L-Chama /
// Ludeva identity; the right panel holds the form. On phones the panel
// collapses to a compact brand bar so the form stays above the fold.
export function AuthShell({ headline, subline, children }: Props) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] bg-background">
      <aside className="relative overflow-hidden bg-brand-dark px-6 py-6 lg:px-12 lg:py-12 flex flex-col justify-between gap-10">
        <Link href="/" aria-label="L-Chama home" className="relative z-10 inline-flex w-fit">
          <Image src="/lchama-logo-dark.png" alt="L-Chama by Ludeva" width={155} height={77} priority className="h-10 w-auto" />
        </Link>

        <div className="relative z-10 hidden lg:block max-w-md">
          <h1 className="font-headline text-4xl xl:text-5xl font-bold leading-[1.08] tracking-tight">{headline}</h1>
          <p className="mt-4 text-lg text-white/75">{subline}</p>
          <ul className="mt-8 space-y-3">
            {PROMISES.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm text-white/85">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <Image
          src="/images/art-auth.svg"
          alt=""
          aria-hidden="true"
          width={640}
          height={620}
          className="pointer-events-none absolute -bottom-24 -right-24 hidden w-[34rem] max-w-none opacity-60 xl:block"
        />

        <p className="relative z-10 hidden lg:block text-sm text-white/60">
          L-Chama is a product of{' '}
          <a href="https://ludevaplc.co.ke" target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-4">
            Ludeva Plc
          </a>
          , Kenya.
        </p>
      </aside>

      <main className="relative flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md flex flex-col items-center gap-4">
          <div className="lg:hidden text-center mb-2">
            <h1 className="font-headline text-2xl font-bold">{headline}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subline}</p>
          </div>
          {children}
          <p className="mt-2 text-xs text-muted-foreground text-center">
            <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">Privacy policy</Link>
            {' and '}
            <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">terms</Link>
            {'. '}
            <Link href="/contact" className="underline underline-offset-4 hover:text-foreground">Need help?</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
