import { prisma } from '@/lib/prisma';
import { requirePanelAccess } from '@/lib/require-panel-access';
import { LastRespectClient } from './LastRespectClient';
import { Card, CardContent } from '@/components/ui/card';
import { HeartHandshake } from 'lucide-react';

export default async function LastRespectPage() {
  const { user, ctx } = await requirePanelAccess('/last-respect');

  if (!ctx.team.hasLastRespectCover) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-headline text-2xl font-semibold">Last Respect Cover</h1>
          <p className="text-muted-foreground">A bereavement fund your chama contributes to together.</p>
        </div>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-8 text-center space-y-2">
            <HeartHandshake className="h-10 w-10 text-chama mx-auto" />
            <p className="font-medium">Not enabled for {ctx.team.name}</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Last Respect Cover wasn't switched on when this chama was set up. Ask your Team Leader
              to contact support to enable it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [fund, claims] = await Promise.all([
    prisma.lastRespectFund.findUnique({ where: { teamId: ctx.team.id } }),
    prisma.lastRespectClaim.findMany({
      where: { teamId: ctx.team.id },
      include: { claimant: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const data = {
    permissions: ctx.permissions,
    isOwner: ctx.isOwner,
    contribution: ctx.team.lastRespectContribution ?? 0,
    balance: fund?.balance ?? 0,
    claims: claims.map((c) => ({
      id: c.id,
      claimantName: c.claimant.fullName || c.claimant.email || 'Unknown member',
      claimantId: c.claimantId,
      deceasedName: c.deceasedName,
      relation: c.relation,
      amount: c.amount,
      notes: c.notes,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Last Respect Cover</h1>
        <p className="text-muted-foreground">
          A bereavement fund {ctx.team.name} contributes to together — KES {data.contribution.toLocaleString()} per member.
        </p>
      </div>
      <LastRespectClient data={data} currentUserId={user.id} />
    </div>
  );
}
