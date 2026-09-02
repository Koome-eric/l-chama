'use client';

import { Suspense } from 'react';
import { SignUp } from '@clerk/nextjs';
import { PostAuthRedirect } from '@/components/PostAuthRedirect';

// Uses Clerk's own hosted sign-up UI directly rather than a custom
// phone-OTP flow — that custom flow depended on phone verification
// (Twilio/SMS) being wired up in the Clerk project, which it isn't yet.
// Falling back to Clerk's default component means sign-up works with
// whatever contact method/verification strategy is actually configured
// for this project in the Clerk dashboard, with no unconnected OTP step
// in the way. Mirrors /sign-in's pattern exactly.
export default function Page() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-background p-4">
      <SignUp path="/sign-up" fallbackRedirectUrl="/onboarding" />
      <Suspense fallback={null}>
        <PostAuthRedirect />
      </Suspense>
    </div>
  );
}
