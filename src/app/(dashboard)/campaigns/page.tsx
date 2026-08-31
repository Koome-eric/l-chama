import Link from 'next/link';
import { Plus } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requirePanelAccess } from '@/lib/require-panel-access';
import { Button } from '@/components/ui/button';
import { CampaignsClient } from './CampaignsClient';

export default async function CampaignsPage() {
  await requirePanelAccess('/campaigns');

  const campaigns = await prisma.campaign.findMany({
    where: { status: 'ACTIVE' },
    include: { creator: true, _count: { select: { donations: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const stats = {
    activeCampaigns: campaigns.length,
    totalRaised: campaigns.reduce((sum, c) => sum + c.raisedAmount, 0),
    verified: campaigns.filter((c) => c.verified).length,
    beneficiaries: campaigns.reduce((sum, c) => sum + (c.beneficiaries ?? 0), 0),
  };

  const data = campaigns.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    location: c.location,
    targetAmount: c.targetAmount,
    raisedAmount: c.raisedAmount,
    backersCount: c.backersCount,
    verified: c.verified,
    deadline: c.deadline.toISOString(),
    creatorName: c.creator.fullName || c.creator.email || 'Anonymous',
    donationCount: c._count.donations,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-semibold">Fundraising Campaigns</h1>
          <p className="text-muted-foreground">
            Support causes that matter. Every contribution makes a difference.
          </p>
        </div>
        <Button asChild>
          <Link href="/campaigns/new">
            <Plus className="h-4 w-4" /> Start a Campaign
          </Link>
        </Button>
      </div>

      <CampaignsClient campaigns={data} stats={stats} />
    </div>
  );
}
