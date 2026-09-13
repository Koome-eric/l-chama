import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Users, Clock, MapPin, BadgeCheck } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatKES } from '@/lib/chama-levels';
import { daysLeft, progressPct } from '@/lib/campaigns';
import { GiveForm } from './GiveForm';

/* ────────────────────────────────────────────────────────────── */
/*  The public face of "Digital Fund-raising" — this is the page a  */
/*  campaign's WhatsApp/SMS/social link actually points to. No sign-*/
/*  in required: see src/app/give/actions.ts for the donation flow. */
/* ────────────────────────────────────────────────────────────── */

export default async function GivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      creator: true,
      donations: {
        where: { status: 'SUCCESS' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!campaign) notFound();

  const pct = progressPct(campaign.raisedAmount, campaign.targetAmount);
  const remaining = daysLeft(campaign.deadline);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <Link href="/" className="text-sm font-headline font-bold text-primary">
          L-CHAMA
        </Link>

        <div className="rounded-2xl overflow-hidden border border-border/60">
          {campaign.imageUrl ? (
            <div className="relative h-56 w-full bg-muted">
              <Image src={campaign.imageUrl} alt={campaign.title} fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="h-40 bg-gradient-to-br from-primary/15 via-primary/5 to-gold/10" />
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{campaign.category}</Badge>
            {campaign.verified && (
              <Badge className="gap-1 bg-primary text-primary-foreground">
                <BadgeCheck className="h-3 w-3" /> Verified
              </Badge>
            )}
            {campaign.status !== 'ACTIVE' && <Badge variant="destructive">Closed</Badge>}
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold">{campaign.title}</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
            by {campaign.creator.fullName || 'An L Chama organizer'}
            <span className="mx-1">·</span>
            <MapPin className="h-3.5 w-3.5" /> {campaign.location}
          </p>
        </div>

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
              <GiveForm campaignId={campaign.id} campaignTitle={campaign.title} />
            ) : (
              <p className="text-sm text-center text-muted-foreground">This campaign is no longer accepting donations.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h2 className="font-headline font-semibold text-lg mb-3">Their Story</h2>
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{campaign.story}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h2 className="font-headline font-semibold text-lg mb-3">Recent supporters</h2>
            {campaign.donations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Be the first to give.</p>
            ) : (
              <ul className="space-y-3">
                {campaign.donations.map((d) => (
                  <li key={d.id} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium">{d.anonymous ? 'Anonymous' : d.guestName || 'A supporter'}</p>
                      {d.message && <p className="text-muted-foreground text-xs mt-0.5">{d.message}</p>}
                    </div>
                    <span className="font-semibold text-gold shrink-0">{formatKES(d.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pb-6">Giving and campaign creation are always free — L-Chama takes a flat 3% fee only when the organizer withdraws.</p>
      </div>
    </div>
  );
}
