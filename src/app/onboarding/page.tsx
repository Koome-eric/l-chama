import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getChamaContext } from '@/lib/chama';

// Not a page itself — routes the person to wherever they left off in
// the pipeline: sign up (Clerk) → profile → organisation → pending
// approval → panel.
export default async function OnboardingHub() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in?redirect_url=/onboarding/profile');

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user || !user.profileCompleted) redirect('/onboarding/profile');

  const ctx = await getChamaContext(user);
  if (!ctx) redirect('/onboarding/organisation');

  if (ctx.isOwner && ctx.team.approvalStatus !== 'APPROVED') {
    redirect('/onboarding/pending');
  }

  redirect('/panel');
}
