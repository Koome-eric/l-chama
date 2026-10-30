import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@clerk/nextjs/server';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { MobileNav, type NavLink } from '@/components/MobileNav';

// "Start a chama" is the header's main button, so it is not repeated here.
const NAV_LINKS: NavLink[] = [
  { href: '/join', label: 'Join my chama' },
  { href: '/products', label: 'Products' },
  { href: '/loans', label: 'Loans' },
  { href: '/fundraising', label: 'Fundraising' },
  { href: '/diaspora', label: 'Diaspora' },
  { href: '/contact', label: 'Contact' },
];

// The mobile menu adds the in-page sections; "Start a chama" is the panel's
// main button, so it is not repeated in the list.
const MOBILE_LINKS: NavLink[] = [
  ...NAV_LINKS,
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#faq', label: 'Questions' },
];

// Server component: the session is read on the server, so public pages do
// not need Clerk's browser SDK just to decide between "Sign in" and
// "My Chama".
export default async function LChamaHeader() {
  let isSignedIn = false;
  try {
    const { userId } = await auth();
    isSignedIn = !!userId;
  } catch {
    // Treat any failure as signed out; the header must never break a page.
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 lg:px-6 py-3">
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/lchama-logo.png"
            alt="L-Chama by Ludeva"
            width={155}
            height={77}
            priority
            className="h-9 w-auto dark:hidden"
          />
          <Image
            src="/lchama-logo-dark.png"
            alt="L-Chama by Ludeva"
            width={155}
            height={77}
            priority
            className="hidden h-9 w-auto dark:block"
          />
        </Link>

        <nav aria-label="Main" className="hidden xl:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-foreground transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-2 sm:gap-3">
            {isSignedIn ? (
              <Button asChild size="sm">
                <Link href="/panel">My Chama</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/start">Start a Chama</Link>
                </Button>
              </>
            )}
          </div>
          <MobileNav links={MOBILE_LINKS} isSignedIn={isSignedIn} />
        </div>
      </div>
    </header>
  );
}
