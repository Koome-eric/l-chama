import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getChamaContext } from '@/lib/chama';
import { PanelClient } from './PanelClient';

export default async function ChamaPanelPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in?redirect_url=/panel');

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user || !user.profileCompleted) {
    redirect('/onboarding/profile');
  }

  const ctx = await getChamaContext(user);
  if (!ctx) redirect('/onboarding/organisation');

  if (ctx.isOwner && ctx.team.approvalStatus !== 'APPROVED') {
    redirect('/onboarding/pending');
  }

  const [loanAccount, loanRequests] = await Promise.all([
    prisma.loanAccount.findUnique({ where: { teamId: ctx.team.id } }),
    prisma.loanRequest.findMany({
      where: { teamId: ctx.team.id },
      include: { requester: true, guarantees: { include: { guarantor: true } }, repayments: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const data = {
    id: ctx.team.id,
    name: ctx.team.name,
    isOwner: ctx.isOwner,
    permissions: ctx.permissions,
    levelName: ctx.team.levelName,
    monthlyAmount: ctx.team.monthlyAmount,
    groupSize: ctx.team.groupSize,
    owner: {
      id: ctx.team.owner.id,
      fullName: ctx.team.owner.fullName,
      email: ctx.team.owner.email,
    },
    members: ctx.team.members.map((m) => ({
      membershipId: m.id,
      userId: m.userId,
      fullName: m.user.fullName,
      email: m.user.email,
      canInvite: m.canInvite,
      canManagePermissions: m.canManagePermissions,
      canRemoveMembers: m.canRemoveMembers,
      canApproveLoans: m.canApproveLoans,
      canInvestPooled: m.canInvestPooled,
      canViewPooledFunds: m.canViewPooledFunds,
      canManageReports: m.canManageReports,
      canWithdraw: m.canWithdraw,
    })),
    invites: ctx.team.invites.map((i) => ({
      id: i.id,
      email: i.email,
      status: i.status,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
      canInvite: i.canInvite,
      canManagePermissions: i.canManagePermissions,
      canRemoveMembers: i.canRemoveMembers,
      canApproveLoans: i.canApproveLoans,
      canInvestPooled: i.canInvestPooled,
      canViewPooledFunds: i.canViewPooledFunds,
      canManageReports: i.canManageReports,
      canWithdraw: i.canWithdraw,
    })),
    loanAccount: loanAccount ? { balance: loanAccount.balance } : { balance: 0 },
    loanRequests: loanRequests.map((r: (typeof loanRequests)[number]) => ({
      id: r.id,
      requesterId: r.requesterId,
      requesterName: r.requester.fullName || r.requester.email || 'Unknown member',
      amount: r.amount,
      purpose: r.purpose,
      status: r.status,
      repaymentWeeks: r.repaymentWeeks,
      createdAt: r.createdAt.toISOString(),
      guarantees: r.guarantees.map((g: (typeof r.guarantees)[number]) => ({
        guarantorId: g.guarantorId,
        guarantorName: g.guarantor.fullName || g.guarantor.email || 'Unknown member',
      })),
      repayments: r.repayments
        .sort((a: (typeof r.repayments)[number], b: (typeof r.repayments)[number]) => a.weekNumber - b.weekNumber)
        .map((rp: (typeof r.repayments)[number]) => ({
          id: rp.id,
          weekNumber: rp.weekNumber,
          dueDate: rp.dueDate.toISOString(),
          amount: rp.amount,
          paid: rp.paid,
        })),
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold">{data.name}</h1>
        <p className="text-muted-foreground">
          {data.levelName ? `${data.levelName} level` : 'Chama'} · Your shared L-CHAMA dashboard.
        </p>
      </div>
      <PanelClient team={data} currentUserId={user.id} defaultTab={tab} />
    </div>
  );
}
