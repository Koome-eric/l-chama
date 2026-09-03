import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { isPlatformAdmin } from '@/lib/admin';
import { hasAdminSession } from '@/lib/admin-auth';
import { AdminClient } from './AdminClient';
import { AdminLogin } from './AdminLogin';
import { SidebarProvider } from '@/components/ui/sidebar';

export default async function AdminPage() {
  const { userId: clerkId } = await auth();
  const viaClerk = isPlatformAdmin(clerkId);
  const viaPassword = await hasAdminSession();
  const hasAccess = viaClerk || viaPassword;

  if (!hasAccess) {
    return <AdminLogin />;
  }

  const [teams, campaigns, products, reports, totalUsers, pooledFundsAgg] = await Promise.all([
    prisma.team.findMany({ include: { owner: true }, orderBy: { submittedAt: 'desc' } }),
    prisma.campaign.findMany({ include: { creator: true }, orderBy: { createdAt: 'desc' } }),
    prisma.investmentProduct.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.memberReport.findMany({ include: { team: true }, orderBy: { uploadedAt: 'desc' }, take: 200 }),
    prisma.user.count(),
    prisma.loanAccount.aggregate({ _sum: { balance: true } }),
  ]);

  const data = teams.map((t: (typeof teams)[number]) => ({
    id: t.id,
    name: t.name,
    ownerName: t.owner.fullName || t.owner.email || t.owner.phone || 'Unknown',
    ownerEmail: t.owner.email,
    ownerPhone: t.owner.phone,
    levelName: t.levelName,
    businessRegNumber: t.businessRegNumber,
    numberOfMembers: t.numberOfMembers,
    totalDirectors: t.totalDirectors,
    physicalAddress: t.physicalAddress,
    additionalComments: t.additionalComments,
    approvalStatus: t.approvalStatus,
    submittedAt: t.submittedAt.toISOString(),
    rejectionReason: t.rejectionReason,
    isDiaspora: t.isDiaspora,
    objectives: t.objectives,
    membersRunningSME: t.membersRunningSME,
    membersEmployed: t.membersEmployed,
    hasLastRespectCover: t.hasLastRespectCover,
    lastRespectContribution: t.lastRespectContribution,
  }));

  const campaignData = campaigns.map((c: (typeof campaigns)[number]) => ({
    id: c.id,
    title: c.title,
    creatorName: c.creator.fullName || c.creator.email || 'Unknown',
    category: c.category,
    targetAmount: c.targetAmount,
    raisedAmount: c.raisedAmount,
    verified: c.verified,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
  }));

  const productData = products.map((p: (typeof products)[number]) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    description: p.description,
    roi: p.roi,
    roiMax: p.roiMax,
    duration: p.duration,
    minAmount: p.minAmount,
    maxAmount: p.maxAmount,
    isActive: p.isActive,
  }));

  const reportData = reports.map((r: (typeof reports)[number]) => ({
    id: r.id,
    teamName: r.team?.name ?? null,
    memberEmail: r.memberEmail,
    memberName: r.memberName,
    date: r.date,
    principal: r.principal,
    rate: r.rate,
    roi: r.roi,
    withdrawal: r.withdrawal,
    closingBal: r.closingBal,
    periodLabel: r.periodLabel,
    uploadedAt: r.uploadedAt.toISOString(),
  }));

  // ── Aggregate stats for the Overview dashboard ──
  const now = new Date();
  const monthLabels: string[] = [];
  const monthCounts: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    const count = teams.filter((t: (typeof teams)[number]) => {
      const s = t.submittedAt;
      return s.getFullYear() === d.getFullYear() && s.getMonth() === d.getMonth();
    }).length;
    monthLabels.push(label);
    monthCounts.push(count);
  }

  const stats = {
    totalUsers,
    totalPooledFunds: pooledFundsAgg._sum.balance ?? 0,
    orgs: {
      total: teams.length,
      pending: teams.filter((t: (typeof teams)[number]) => t.approvalStatus === 'PENDING_APPROVAL').length,
      approved: teams.filter((t: (typeof teams)[number]) => t.approvalStatus === 'APPROVED').length,
      rejected: teams.filter((t: (typeof teams)[number]) => t.approvalStatus === 'REJECTED').length,
    },
    campaigns: {
      total: campaigns.length,
      unverified: campaigns.filter((c: (typeof campaigns)[number]) => !c.verified).length,
      verified: campaigns.filter((c: (typeof campaigns)[number]) => c.verified).length,
      active: campaigns.filter((c: (typeof campaigns)[number]) => c.status === 'ACTIVE').length,
      totalRaised: campaigns.reduce((sum: number, c: (typeof campaigns)[number]) => sum + c.raisedAmount, 0),
      totalTarget: campaigns.reduce((sum: number, c: (typeof campaigns)[number]) => sum + c.targetAmount, 0),
    },
    products: {
      total: products.length,
      active: products.filter((p: (typeof products)[number]) => p.isActive).length,
      inactive: products.filter((p: (typeof products)[number]) => !p.isActive).length,
    },
    reports: {
      total: reports.length,
      matched: reports.filter((r: (typeof reports)[number]) => r.teamId).length,
    },
    monthlyOrgSubmissions: monthLabels.map((label, i) => ({ label, value: monthCounts[i] })),
  };

  return (
    <SidebarProvider>
      <AdminClient
        teams={data}
        campaigns={campaignData}
        products={productData}
        reports={reportData}
        stats={stats}
        authMethod={viaClerk ? 'clerk' : 'password'}
      />
    </SidebarProvider>
  );
}
