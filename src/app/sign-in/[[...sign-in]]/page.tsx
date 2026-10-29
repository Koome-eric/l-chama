'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';
import { PostAuthRedirect } from '@/components/PostAuthRedirect';
import { CaptureAuthRedirect } from '@/components/CaptureAuthRedirect';
import { AuthShell } from '@/components/AuthShell';
import { clerkAppearance } from '@/lib/clerk-appearance';

export default function Page() {
  return (
    <AuthShell
      headline="Welcome back to your chama."
      subline="Sign in to see your contributions, loans and savings."
    >
      <SignIn path="/sign-in" fallbackRedirectUrl="/onboarding" appearance={clerkAppearance} />
      <p className="text-sm text-muted-foreground">
        New to L-Chama?{' '}
        <Link href="/sign-up" className="font-medium text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
      <Suspense fallback={null}>
        <CaptureAuthRedirect />
        <PostAuthRedirect />
      </Suspense>
    </AuthShell>
  );
}
