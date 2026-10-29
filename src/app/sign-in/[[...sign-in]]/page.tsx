'use client';

import { Suspense } from 'react';
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
      <Suspense fallback={null}>
        <CaptureAuthRedirect />
        <PostAuthRedirect />
      </Suspense>
    </AuthShell>
  );
}
