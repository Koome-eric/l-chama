'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { SignUp } from '@clerk/nextjs';
import { PostAuthRedirect } from '@/components/PostAuthRedirect';
import { CaptureAuthRedirect } from '@/components/CaptureAuthRedirect';
import { AuthShell } from '@/components/AuthShell';
import { clerkAppearance } from '@/lib/clerk-appearance';
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
    <AuthShell
      headline="Start your chama on the record."
      subline="Create your account, then invite your members. There is no signup fee."
    >
      {agreed ? (
        <SignUp path="/sign-up" fallbackRedirectUrl="/onboarding" appearance={clerkAppearance} />
      ) : (
        <div className="w-full space-y-4 rounded-2xl border bg-card p-6">
          <h2 className="font-headline text-xl font-semibold">Create your L-Chama account</h2>
          <p className="text-sm text-muted-foreground">
            Please review and accept our Privacy Policy to continue.
          </p>
          <PrivacyConsent checked={agreed} onChange={setAgreed} id="signup-privacy-consent" />
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
      <Suspense fallback={null}>
        <CaptureAuthRedirect />
        <PostAuthRedirect />
      </Suspense>
    </AuthShell>
  );
}
