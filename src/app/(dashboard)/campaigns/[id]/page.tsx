import { notFound } from 'next/navigation';
import Image from 'next/image';
import { BadgeCheck, MapPin, Clock, Users } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requirePanelAccess } from '@/lib/require-panel-access';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatKES } from '@/lib/chama-levels';
import { daysLeft, progressPct } from '@/lib/campaigns';
import { DonateDialog } from '../CampaignsClient';
import { CloseCampaignButton } from './CloseCampaignButton';

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requirePanelAccess('/campaigns');
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      creator: true,
      donations: {
        include: { donor: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!campaign) notFound();

  const pct = progressPct(campaign.raisedAmount, campaign.targetAmount);
  const remaining = daysLeft(campaign.deadline);
  const isCreator = campaign.creatorId === user.id;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="rounded-2xl overflow-hidden border border-border/60">
        {campaign.imageUrl ? (
          <div className="relative h-56 w-full bg-muted">
            <Image src={campaign.imageUrl} alt={campaign.title} fill className="object-cover" unoptimized />
          </div>
        ) : (
          <div className="h-40 bg-gradient-to-br from-primary/15 via-primary/5 to-gold/10" />
        )}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{campaign.category}</Badge>
            {campaign.verified && (
              <Badge className="gap-1 bg-primary text-primary-foreground">
                <BadgeCheck className="h-3 w-3" /> Verified
              </Badge>
            )}
            {campaign.status === 'CLOSED' && <Badge variant="destructive">Closed</Badge>}
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold">{campaign.title}</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            by {campaign.creator.fullName || campaign.creator.email || 'Anonymous'}
            <span className="mx-1">·</span>
            <MapPin className="h-3.5 w-3.5" /> {campaign.location}
          </p>
        </div>
        {isCreator && campaign.status === 'ACTIVE' && <CloseCampaignButton campaignId={campaign.id} />}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <h2 className="font-headline font-semibold text-lg mb-3">Their Story</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {campaign.story}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <h2 className="font-headline font-semibold text-lg mb-3">
                Donors ({campaign.donations.length})
              </h2>
              {campaign.donations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Be the first to donate.</p>
              ) : (
                <ul className="space-y-3">
                  {campaign.donations.map((d) => (
                    <li key={d.id} className="flex items-start justify-between gap-3 text-sm">
                      <div>
                        <p className="font-medium">
                          {d.anonymous ? 'Anonymous' : d.donor.fullName || d.donor.email || 'Supporter'}
                        </p>
                        {d.message && <p className="text-muted-foreground text-xs mt-0.5">{d.message}</p>}
                      </div>
                      <span className="font-semibold text-gold shrink-0">{formatKES(d.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gold rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-2xl font-bold text-gold">{formatKES(campaign.raisedAmount)}</p>
                <p className="text-sm text-muted-foreground">of {formatKES(campaign.targetAmount)} goal</p>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-3">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" /> {campaign.backersCount} backers
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" /> {remaining} days left
                </span>
              </div>

              {campaign.status === 'ACTIVE' ? (
                <DonateDialog campaignId={campaign.id} campaignTitle={campaign.title} />
              ) : (
                <p className="text-sm text-center text-muted-foreground">This campaign is closed.</p>
              )}
            </CardContent>
          </Card>

          {campaign.beneficiaries != null && (
            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Beneficiaries</p>
                <p className="text-xl font-bold font-headline">{campaign.beneficiaries.toLocaleString()}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
