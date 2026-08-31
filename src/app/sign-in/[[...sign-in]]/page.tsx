'use client';

import { Suspense } from 'react';
import { SignIn } from '@clerk/nextjs';
import { PostAuthRedirect } from '@/components/PostAuthRedirect';

export default function Page() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-background">
      <SignIn path="/sign-in" fallbackRedirectUrl="/onboarding" />
      <Suspense fallback={null}>
        <PostAuthRedirect />
      </Suspense>
    </div>
  );
}
