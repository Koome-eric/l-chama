'use client';

import { Suspense, useState } from 'react';
import { SignUp } from '@clerk/nextjs';
import { PostAuthRedirect } from '@/components/PostAuthRedirect';
import { CaptureAuthRedirect } from '@/components/CaptureAuthRedirect';
import { PrivacyConsent } from '@/components/PrivacyConsent';

// Uses Clerk's own hosted sign-up UI directly rather than a custom
// phone-OTP flow — that custom flow depended on phone verification
// (Twilio/SMS) being wired up in the Clerk project, which it isn't yet.
// Falling back to Clerk's default component means sign-up works with
// whatever contact method/verification strategy is actually configured
// for this project in the Clerk dashboard, with no unconnected OTP step
// in the way. Mirrors /sign-in's pattern exactly.
export default function Page() {
  // Applicants must tick "I Agree" to the Privacy Policy before Clerk's
  // sign-up form is shown.
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4 gap-4">
      {agreed ? (
        <SignUp path="/sign-up" fallbackRedirectUrl="/onboarding" />
      ) : (
        <div className="w-full max-w-sm space-y-3">
          <h1 className="font-headline text-xl font-semibold text-center">Create your L-Chama account</h1>
          <p className="text-sm text-muted-foreground text-center">
            Please review and accept our Privacy Policy to continue.
          </p>
          <PrivacyConsent checked={agreed} onChange={setAgreed} id="signup-privacy-consent" />
        </div>
      )}
      <Suspense fallback={null}>
        <CaptureAuthRedirect />
        <PostAuthRedirect />
      </Suspense>
    </div>
  );
}
