import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getChamaContext } from '@/lib/chama';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' };

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json(
      { exists: false, profileCompleted: false, hasTeam: false, teamApprovalStatus: null, pendingInviteToken: null },
      { status: 200, headers: NO_STORE }
    );
  }

  // A pending chama invite for this email takes priority over everything
  // else here. Without this check, a freshly-authenticated invitee who
  // Clerk happens to route through the plain /sign-up page (rather than
  // completing inline on /invite/[token]) gets swept into "create your
  // own chama" onboarding instead of the chama they were actually
  // invited to — this is what makes that redirect invite-aware.
  const clerkEmail =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
    clerkUser.emailAddresses[0]?.emailAddress;

  if (clerkEmail) {
    const pendingInvite = await prisma.teamInvite.findFirst({
      where: { email: clerkEmail.toLowerCase(), status: 'PENDING', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (pendingInvite) {
      return NextResponse.json(
        {
          exists: false,
          profileCompleted: false,
          hasTeam: false,
          teamApprovalStatus: null,
          pendingInviteToken: pendingInvite.token,
        },
        { status: 200, headers: NO_STORE }
      );
    }
  }

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });

  if (!user) {
    return NextResponse.json(
      { exists: false, profileCompleted: false, hasTeam: false, teamApprovalStatus: null, pendingInviteToken: null },
      { status: 200, headers: NO_STORE }
    );
  }

  const ctx = await getChamaContext(user);

  return NextResponse.json(
    {
      exists: true,
      profileCompleted: user.profileCompleted,
      hasTeam: !!ctx,
      isOwner: ctx?.isOwner ?? false,
      teamApprovalStatus: ctx?.team.approvalStatus ?? null,
      pendingInviteToken: null,
    },
    { headers: NO_STORE }
  );
}
