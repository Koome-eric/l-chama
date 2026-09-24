'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LChamaHeader() {
  const { isSignedIn } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex items-center justify-between px-4 lg:px-6 py-3">
        <Link href="/" className="flex items-center">
          <Image
            src="/lchama-logo.png"
            alt="L-Chama by Ludeva"
            width={155}
            height={77}
            priority
            className="h-9 w-auto"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="/contact" className="hover:text-foreground transition-colors">
            Contact
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
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
                <Link href="/sign-up">Start a Chama</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
