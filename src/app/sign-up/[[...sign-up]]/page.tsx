'use client';

import { Suspense } from 'react';
import { SignUp } from '@clerk/nextjs';
import { PostAuthRedirect } from '@/components/PostAuthRedirect';
import { CaptureAuthRedirect } from '@/components/CaptureAuthRedirect';

// Uses Clerk's own hosted sign-up UI directly rather than a custom
// phone-OTP flow — that custom flow depended on phone verification
// (Twilio/SMS) being wired up in the Clerk project, which it isn't yet.
// Falling back to Clerk's default component means sign-up works with
// whatever contact method/verification strategy is actually configured
// for this project in the Clerk dashboard, with no unconnected OTP step
// in the way. Mirrors /sign-in's pattern exactly.
export default function Page() {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4 gap-4">
      <SignUp path="/sign-up" fallbackRedirectUrl="/onboarding" />
      <p className="text-xs text-muted-foreground text-center max-w-sm">
        By creating an account you agree to our{' '}
        <a href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </a>
        .
      </p>
      <Suspense fallback={null}>
        <CaptureAuthRedirect />
        <PostAuthRedirect />
      </Suspense>
    </div>
  );
}
