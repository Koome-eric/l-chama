'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

export function PostAuthRedirect() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const redirect = async () => {
      try {
        const res = await fetch('/api/auth/check-user', { cache: 'no-store' });
        const data = await res.json();

        if (!data.exists || !data.profileCompleted) {
          router.replace('/onboarding/profile');
          return;
        }

        if (!data.hasTeam) {
          router.replace('/onboarding/organisation');
          return;
        }

        if (data.isOwner && data.teamApprovalStatus !== 'APPROVED') {
          router.replace('/onboarding/pending');
          return;
        }

        router.replace('/panel');
      } catch (err) {
        console.error('[POST-AUTH]', err);
        router.replace('/onboarding/profile');
      } finally {
        setChecking(false);
      }
    };

    redirect();
  }, [isLoaded, user, router]);

  return null;
}
