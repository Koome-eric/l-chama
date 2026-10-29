import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { MarketingShell, PageIntro } from '@/components/MarketingShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CountUp } from '@/components/motion/CountUp';
import { getLandingContext } from '@/lib/landing-context';

export const metadata = {
  title: 'Fundraising Campaigns | L-Chama',
  description: 'Start and support community fundraisers — welfare, medical costs, education — from your chama dashboard.',
};

export default async function FundraisingPage() {
  const { hasAccount } = await getLandingContext();
  const active = await prisma.campaign.aggregate({
    where: { status: 'ACTIVE' },
    _count: { _all: true },
    _sum: { raisedAmount: true },
  });

  return (
    <MarketingShell>
      <PageIntro title="Fundraising campaigns">
        Beyond chama loans, members can start and support community fundraisers — welfare funds, medical
        costs, education, and causes that matter — right from the same dashboard.
      </PageIntro>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <Button asChild size="lg">
              <Link href={hasAccount ? '/campaigns' : '/sign-up'}>
                Explore campaigns <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              A 5% platform fee applies to campaign fund withdrawals for external chamas. See{' '}
              <Link href="/loans" className="underline hover:text-primary">loan terms &amp; fees</Link>.
            </p>
          </div>
          {/* Placeholder zeros erode trust — only show live totals once there is something to show. */}
          {active._count._all > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <Card className="rounded-2xl">
                <CardContent className="p-6">
                  <p className="font-figures text-3xl font-bold font-headline">
                    <CountUp value={active._count._all} />
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Active campaigns</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardContent className="p-6">
                  <p className="font-figures text-3xl font-bold font-headline text-gold">
                    KES <CountUp value={active._sum.raisedAmount ?? 0} />
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Total raised</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>
    </MarketingShell>
  );
}
