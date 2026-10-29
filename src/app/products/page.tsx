import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { PublicPage } from '@/components/PublicPage';
import { Button } from '@/components/ui/button';
import { CountUp } from '@/components/motion/CountUp';
import { PRODUCTS } from '@/lib/landing-content';
import { CHAMA_LEVELS, formatKES } from '@/lib/chama-levels';
import { RATES_EFFECTIVE } from '@/lib/legal';
import { getVisitorState } from '@/lib/landing-auth';

export const metadata = { title: 'Products and rates — L-Chama' };

export default async function ProductsPage() {
  const { hasAccount, productHref } = await getVisitorState();
  const campaigns = await prisma.campaign.aggregate({
    where: { status: 'ACTIVE' },
    _count: { _all: true },
    _sum: { raisedAmount: true },
  });
  const raised = campaigns._sum.raisedAmount ?? 0;

  return (
    <PublicPage
      title="Products and rates"
      art="/images/art-products.svg"
      intro="Put your chama's money to work, or protect your members. Everything is managed from the same dashboard."
      meta={`Rates effective ${RATES_EFFECTIVE}. Rates are annual, indicative and not guaranteed, and can change.`}
    >
      <ul className="space-y-6">
        {PRODUCTS.map((p) => (
          <li key={p.name} className="grid gap-6 rounded-2xl border bg-card p-6 md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="font-headline text-2xl font-semibold">{p.name}</h2>
              <p className="mt-1 text-muted-foreground">{p.summary}</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {p.points.map((pt) => (
                  <li key={pt} className="text-muted-foreground">– {pt}</li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end md:text-right">
              {p.rate ? (
                <div>
                  <p className="font-figures text-3xl font-bold text-primary">{p.rate}</p>
                  <p className="text-xs text-muted-foreground">{p.rateNote}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{p.rateNote}</p>
              )}
              <Button asChild>
                <Link href={productHref(p.target)}>
                  {hasAccount ? `Open ${p.name}` : `Sign up for ${p.name}`} <ArrowRight />
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <section className="mt-16">
        <h2 className="font-headline text-2xl md:text-3xl font-bold">Monthly contribution levels</h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Every member of a chama contributes the same amount each month. The level you pick at setup sets your tier.
        </p>
        <ul className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-5">
          {CHAMA_LEVELS.map((l) => (
            <li key={l.key} className="bg-card px-5 py-5">
              <p className="text-sm text-muted-foreground">{l.name}</p>
              <p className="mt-1 font-figures text-lg font-bold">{formatKES(l.monthlyAmount)}</p>
              <p className="text-xs text-muted-foreground">per member, {l.groupSize}+ members</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 flex flex-col gap-4 rounded-2xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-headline text-xl font-semibold">Fundraising campaigns</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Start or support a community fundraiser for welfare, medical costs or education.
            {campaigns._count._all > 0 && (
              <>
                {' '}<span className="font-figures font-semibold text-foreground">{campaigns._count._all}</span> active now
                {raised > 0 && (
                  <>, <span className="font-figures font-semibold text-foreground">KES <CountUp value={raised} /></span> raised</>
                )}
                .
              </>
            )}
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link href={hasAccount ? '/campaigns' : '/sign-up'}>Explore campaigns</Link>
        </Button>
      </section>
    </PublicPage>
  );
}
