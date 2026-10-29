import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getChamaContext } from '@/lib/chama';

// Where should a visitor's primary button take them? Shared by the landing
// page and the public info pages so every call to action behaves the same.
//   signed out            → sign up (target product carried through)
//   signed in, onboarded  → straight to the product
//   signed in, mid-setup  → continue onboarding first
export async function getVisitorState() {
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

  const productHref = (target: string) =>
    !hasAccount
      ? `/sign-up?redirect_url=${encodeURIComponent(target)}`
      : alreadyOnboarded
        ? target
        : ctaHref;

  return { hasAccount, ctaHref, alreadyOnboarded, productHref };
}
