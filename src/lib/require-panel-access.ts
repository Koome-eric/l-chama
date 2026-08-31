import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getChamaContext, type ChamaContext } from '@/lib/chama';
import type { User } from '@prisma/client';

// ─────────────────────────────────────────────
// Same gate the panel page uses: signed in → profile complete → has a
// chama → chama approved (if you're the owner). Shared so every page in
// the dashboard sidebar enforces it identically instead of copy-pasting
// the redirect chain everywhere.
// ─────────────────────────────────────────────
export async function requirePanelAccess(
  currentPath: string
): Promise<{ user: User; ctx: ChamaContext }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect(`/sign-in?redirect_url=${currentPath}`);

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user || !user.profileCompleted) redirect('/onboarding/profile');

  const ctx = await getChamaContext(user);
  if (!ctx) redirect('/onboarding/organisation');

  if (ctx.isOwner && ctx.team.approvalStatus !== 'APPROVED') {
    redirect('/onboarding/pending');
  }

  return { user, ctx };
}
