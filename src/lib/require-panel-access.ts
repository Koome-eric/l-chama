import { redirect } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getChamaContext, type ChamaContext } from '@/lib/chama';
import type { User } from '@prisma/client';

// ─────────────────────────────────────────────
// Same gate the panel page uses: signed in → profile complete → has a
// chama → chama approved (if you're the owner). Shared so every page in
// the dashboard sidebar enforces it identically instead of copy-pasting
// the redirect chain everywhere.
//
// A pending chama invite for the signed-in email always wins over the
// "create your own chama" onboarding chain below — this is what stops
// an invited member from being funnelled into onboarding if they ever
// reach a dashboard route before accepting their invite.
// ─────────────────────────────────────────────
export async function requirePanelAccess(
  currentPath: string
): Promise<{ user: User; ctx: ChamaContext }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect(`/sign-in?redirect_url=${currentPath}`);

  const user = await prisma.user.findUnique({ where: { clerkId } });

  if (!user || !user.profileCompleted) {
    const clerkUser = await currentUser();
    const clerkEmail =
      clerkUser?.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
      clerkUser?.emailAddresses[0]?.emailAddress;
    if (clerkEmail) {
      const pendingInvite = await prisma.teamInvite.findFirst({
        where: { email: clerkEmail.toLowerCase(), status: 'PENDING', expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      });
      if (pendingInvite) redirect(`/invite/${pendingInvite.token}`);
    }
    redirect('/onboarding/profile');
  }

  const ctx = await getChamaContext(user);
  if (!ctx) redirect('/onboarding/organisation');

  if (ctx.isOwner && ctx.team.approvalStatus !== 'APPROVED') {
    redirect('/onboarding/pending');
  }

  return { user, ctx };
}
