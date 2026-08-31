import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getChamaContext } from '@/lib/chama';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' };

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { exists: false, profileCompleted: false, hasTeam: false, teamApprovalStatus: null },
      { status: 200, headers: NO_STORE }
    );
  }

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });

  if (!user) {
    return NextResponse.json(
      { exists: false, profileCompleted: false, hasTeam: false, teamApprovalStatus: null },
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
    },
    { headers: NO_STORE }
  );
}
