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

  const [loanAccount, loanRequests, savingsEntries] = await Promise.all([
    prisma.loanAccount.findUnique({ where: { teamId: ctx.team.id } }),
    prisma.loanRequest.findMany({
      where: { teamId: ctx.team.id },
      include: { requester: true, guarantees: { include: { guarantor: true } }, repayments: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.savingsEntry.findMany({ where: { teamId: ctx.team.id } }),
  ]);

  // Chama-wide savings totals — no interest (that's a Ludeva Investment
  // Account feature, not part of normal L-Chama savings). "Total Chama
  // Funds" = all deposits ever made; "Total Payout" = all payouts ever
  // made; "Total Balance" = Funds - Payout. Sums every member's entries
  // together since these are chama-wide figures, not per-member.
  const parseAmount = (v: string | null) => {
    if (!v) return 0;
    const n = Number(v.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const totalChamaFunds = savingsEntries.reduce((sum, e) => sum + parseAmount(e.deposit), 0);
  const totalPayout = savingsEntries.reduce((sum, e) => sum + parseAmount(e.payout), 0);
  const totalBalance = totalChamaFunds - totalPayout;

  // Per-member leaderboard — total deposited, entry ("contribution
  // streak") count, and last-contribution date, for the gamified
  // dashboard's ranking cards.
  const byMember = new Map<
    string,
    { name: string; totalDeposits: number; totalPayout: number; entryCount: number; lastDate: string | null }
  >();
  for (const e of savingsEntries) {
    const key = e.memberEmail;
    const existing = byMember.get(key) ?? {
      name: e.memberName || e.memberEmail,
      totalDeposits: 0,
      totalPayout: 0,
      entryCount: 0,
      lastDate: null,
    };
    existing.totalDeposits += parseAmount(e.deposit);
    existing.totalPayout += parseAmount(e.payout);
    existing.entryCount += 1;
    const entryDate = e.date || e.periodLabel;
    if (entryDate && (!existing.lastDate || entryDate > existing.lastDate)) existing.lastDate = entryDate;
    byMember.set(key, existing);
  }
  const leaderboard = [...byMember.values()]
    .sort((a, b) => b.totalDeposits - a.totalDeposits)
    .slice(0, 8);

  // Period time-series — deposits grouped by Period Label (falling back
  // to Date) for the funds-growth chart. Chronological, last 12 points.
  const byPeriod = new Map<string, number>();
  for (const e of savingsEntries) {
    const label = e.periodLabel || e.date || 'Unlabelled';
    byPeriod.set(label, (byPeriod.get(label) ?? 0) + parseAmount(e.deposit));
  }
  const periodSeries = [...byPeriod.entries()]
    .sort((a, b) => (a[0] > b[0] ? 1 : -1))
    .slice(-12)
    .map(([label, amount]) => ({ label, amount }));

  // Milestone progress — a simple gamified "next target" ladder.
  const MILESTONES = [50000, 100000, 250000, 500000, 1000000, 2000000, 5000000];
  const nextMilestone = MILESTONES.find((m) => m > totalBalance) ?? MILESTONES[MILESTONES.length - 1] * 2;
  const prevMilestone = [...MILESTONES].reverse().find((m) => m <= totalBalance) ?? 0;
  const milestoneProgress = nextMilestone > prevMilestone
    ? Math.min(100, Math.round(((totalBalance - prevMilestone) / (nextMilestone - prevMilestone)) * 100))
    : 100;

  const data = {
    id: ctx.team.id,
    name: ctx.team.name,
    isOwner: ctx.isOwner,
    permissions: ctx.permissions,
    levelName: ctx.team.levelName,
    monthlyAmount: ctx.team.monthlyAmount,
    groupSize: ctx.team.groupSize,
    isDiaspora: ctx.team.isDiaspora,
    objectives: ctx.team.objectives,
    hasLastRespectCover: ctx.team.hasLastRespectCover,
    owner: {
      id: ctx.team.owner.id,
      fullName: ctx.team.owner.fullName,
      email: ctx.team.owner.email ?? 'Unknown email',
    },
    members: ctx.team.members.map((m) => ({
      membershipId: m.id,
      userId: m.userId,
      fullName: m.user.fullName,
      email: m.user.email ?? 'Unknown email',
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
      token: i.token,
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
    savingsSummary: {
      totalChamaFunds,
      totalPayout,
      totalBalance,
      entryCount: savingsEntries.length,
      leaderboard,
      periodSeries,
      milestone: { next: nextMilestone, prev: prevMilestone, progress: milestoneProgress },
    },
    loanRequests: loanRequests.map((r: (typeof loanRequests)[number]) => ({
      id: r.id,
      requesterId: r.requesterId,
      requesterName: r.requester.fullName || r.requester.email || 'Unknown member',
      amount: r.amount,
      purpose: r.purpose,
      status: r.status,
      months: r.months,
      repaymentWeeks: r.repaymentWeeks,
      interestRate: r.interestRate,
      processingFee: r.processingFee,
      processingFeePaid: r.processingFeePaid,
      createdAt: r.createdAt.toISOString(),
      guarantees: r.guarantees.map((g: (typeof r.guarantees)[number]) => ({
        guarantorId: g.guarantorId,
        guarantorName: g.guarantor.fullName || g.guarantor.email || 'Unknown member',
        signatureName: g.signatureName,
        signedAt: g.createdAt.toISOString(),
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
