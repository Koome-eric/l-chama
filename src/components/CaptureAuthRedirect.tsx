'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const POST_AUTH_REDIRECT_KEY = 'lchama_post_auth_redirect';

// Landing-page product links pass ?redirect_url=/invest?type=MMF (etc) to
// /sign-up or /sign-in. Clerk's own flow can navigate through a few
// internal steps (OTP, OAuth callback...) before landing back here, which
// can drop query params — so we stash the target in sessionStorage as
// soon as this page loads, and PostAuthRedirect reads it back once the
// member is signed in and fully onboarded.
export function CaptureAuthRedirect() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const target = searchParams.get('redirect_url');
    if (target) {
      sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, target);
    }
  }, [searchParams]);

  return null;
}
