import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getChamaContext } from '@/lib/chama';

// Where a visitor should be sent, given how far through onboarding they are.
// Shared by the home page and every public marketing page so the CTAs
// behave identically everywhere.
export async function getLandingContext() {
  const { userId } = await auth();

  let hasAccount = false;
  let ctaHref = '/onboarding/profile';
  let alreadyOnboarded = false;

  if (userId) {
    hasAccount = true;
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user || !user.profileCompleted) {
      ctaHref = '/onboarding/profile';
    } else {
      const ctx = await getChamaContext(user);
      if (!ctx) {
        ctaHref = '/onboarding/organisation';
      } else if (ctx.isOwner && ctx.team.approvalStatus !== 'APPROVED') {
        ctaHref = '/onboarding/pending';
      } else {
        ctaHref = '/panel';
        alreadyOnboarded = true;
      }
    }
  }

  // Signed-out visitor → sign up, carrying the target through so
  // CaptureAuthRedirect/PostAuthRedirect land them there once onboarded.
  const productHref = (target: string) =>
    !hasAccount
      ? `/sign-up?redirect_url=${encodeURIComponent(target)}`
      : alreadyOnboarded
        ? target
        : ctaHref;

  return { hasAccount, ctaHref, alreadyOnboarded, productHref };
}
