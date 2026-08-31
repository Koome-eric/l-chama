import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { isPlatformAdmin } from '@/lib/admin';
import LChamaHeader from '@/components/LChamaHeader';
import LChamaFooter from '@/components/LChamaFooter';
import { AdminClient } from './AdminClient';

export default async function AdminPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in?redirect_url=/admin');
  if (!isPlatformAdmin(clerkId)) redirect('/');

  const teams = await prisma.team.findMany({
    include: { owner: true },
    orderBy: { submittedAt: 'desc' },
  });

  const campaigns = await prisma.campaign.findMany({
    include: { creator: true },
    orderBy: { createdAt: 'desc' },
  });

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

  const products = await prisma.investmentProduct.findMany({ orderBy: { createdAt: 'desc' } });
  const productData = products.map((p: (typeof products)[number]) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    description: p.description,
    roi: p.roi,
    duration: p.duration,
    minAmount: p.minAmount,
    maxAmount: p.maxAmount,
    isActive: p.isActive,
  }));

  const reports = await prisma.memberReport.findMany({
    include: { team: true },
    orderBy: { uploadedAt: 'desc' },
    take: 200,
  });
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

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LChamaHeader />
      <main className="flex-1 container mx-auto px-4">
        <div className="py-10 max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="font-headline text-2xl font-semibold">Admin</h1>
            <p className="text-muted-foreground">Review chamas, campaigns, investment products, and member reports.</p>
          </div>
          <AdminClient teams={data} campaigns={campaignData} products={productData} reports={reportData} />
        </div>
      </main>
      <LChamaFooter />
    </div>
  );
}
