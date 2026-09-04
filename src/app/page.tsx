import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@clerk/nextjs/server';
import { ArrowRight, ShieldCheck, HeartHandshake, ClipboardCheck, Landmark } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getChamaContext } from '@/lib/chama';
import LChamaHeader from '@/components/LChamaHeader';
import LChamaFooter from '@/components/LChamaFooter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CHAMA_LEVELS, formatKES } from '@/lib/chama-levels';
import { HeroReveal, HeroRevealItem } from '@/components/motion/HeroReveal';
import { CountUp } from '@/components/motion/CountUp';

// L-Chama is a community-centric fintech platform that digitizes informal
// banking systems, enhances contribution management, and streamlines group
// lending mechanisms. These are its three core, top-line capabilities.
const FEATURES = [
  {
    icon: ClipboardCheck,
    title: 'Digital Ledger & Transparency',
    body: 'Automates capital collection, ledger reconciliation, and real-time transaction reporting and remittance reminders. It replaces manual bookkeeping with an audit trail accessible via a unified dashboard.',
  },
  {
    icon: ShieldCheck,
    title: 'Social Guarantee',
    body: 'Operates a decentralized trust model where credit facility approvals and loan risk assessments rely on social collateral, peer underwriting, and designated admin authorizations rather than traditional credit scoring.',
  },
  {
    icon: Landmark,
    title: 'Digital Group Treasury Management',
    body: 'Offers a digital hub for multi-tiered social structures — investment chamas, merry-go-rounds, diaspora chamas, welfare groups, and Bodaboda associations — to aggregate deposits, manage liquidity, and disburse internal loans.',
  },
];

export default async function LandingPage() {
  const { userId } = await auth();

  let hasAccount = false;
  let ctaHref = '/onboarding/profile';
  let alreadyOnboarded = false;
  if (userId) {
    hasAccount = true;
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user || !user.profileCompleted) {
      ctaHref = '/onboarding/profile';
    } else {
      const ctx = await getChamaContext(user);
      if (!ctx) {
        ctaHref = '/onboarding/organisation';
      } else if (ctx.isOwner && ctx.team.approvalStatus !== 'APPROVED') {
        ctaHref = '/onboarding/pending';
      } else {
        ctaHref = '/panel';
        alreadyOnboarded = true;
      }
    }
  }

  const activeCampaigns = await prisma.campaign.aggregate({
    where: { status: 'ACTIVE' },
    _count: { _all: true },
    _sum: { raisedAmount: true },
  });

  const [poolTotal, activeChamaCount] = await Promise.all([
    prisma.loanAccount.aggregate({ _sum: { balance: true } }),
    prisma.team.count({ where: { approvalStatus: 'APPROVED' } }),
  ]);
  const totalPooled = poolTotal._sum.balance ?? 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LChamaHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-fintech-mesh py-20 md:py-28">
          <div className="container mx-auto px-4">
            <HeroReveal>
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="max-w-2xl">
                  <HeroRevealItem>
                    <h1 className="font-headline text-4xl sm:text-5xl font-bold leading-[1.1] tracking-tight">
                      Your chama's money,{' '}
                      <span className="text-primary">on the record.</span>
                    </h1>
                  </HeroRevealItem>
                  <HeroRevealItem>
                    <p className="mt-4 text-lg sm:text-xl text-muted-foreground">
                      L-Chama is a community-centric fintech platform that digitizes informal
                      banking systems, enhances contribution management, and streamlines group
                      lending mechanisms.
                    </p>
                  </HeroRevealItem>
                  <HeroRevealItem className="mt-8 flex flex-wrap items-center gap-4">
                    {alreadyOnboarded ? (
                      <Button asChild size="lg">
                        <Link href="/panel">
                          Go to My Chama <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : hasAccount ? (
                      <Button asChild size="lg">
                        <Link href={ctaHref}>
                          Continue Setup <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : (
                      <>
                        <Button asChild size="lg">
                          <Link href="/sign-up">
                            Start a Chama <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button asChild size="lg" variant="outline">
                          <Link href="/sign-in">Sign In</Link>
                        </Button>
                      </>
                    )}
                  </HeroRevealItem>
                </div>

                <HeroRevealItem className="relative mx-auto w-full max-w-xl lg:max-w-none">
                  <Image
                    src="/hero-chama.png"
                    alt="Members of a chama reviewing their shared loan account on the L-Chama app"
                    width={604}
                    height={405}
                    priority
                    className="w-full h-auto rounded-2xl shadow-xl"
                  />
                  {totalPooled > 0 && (
                    <div className="glass-card absolute -bottom-6 -left-4 sm:left-6 rounded-2xl px-5 py-4 shadow-lg">
                      <p className="text-xs text-muted-foreground">Pooled on L-Chama right now</p>
                      <p className="font-figures text-2xl font-semibold text-primary">
                        KES <CountUp value={totalPooled} />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        across {activeChamaCount} chama{activeChamaCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  )}
                </HeroRevealItem>
              </div>
            </HeroReveal>
          </div>
        </section>


        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold font-headline text-center mb-2">
              Platform Top Features
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
              L-Chama digitizes informal banking systems, enhances contribution management, and
              streamlines group lending mechanisms.
            </p>
            <div className="grid gap-6 md:grid-cols-3">
              {FEATURES.map((f) => (
                <Card
                  key={f.title}
                  className="rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/30"
                >
                  <CardContent className="p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mt-3 font-headline font-semibold text-lg">{f.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-fintech-mesh border-y border-border/60">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15 mb-4">
                  <HeartHandshake className="h-5 w-5 text-gold" />
                </div>
                <h2 className="text-3xl font-bold font-headline">Fundraising Campaigns</h2>
                <p className="mt-3 text-muted-foreground">
                  Beyond chama loans, members can start and support community fundraisers —
                  welfare funds, medical costs, education, and causes that matter — right from
                  the same dashboard.
                </p>
                <Button asChild size="lg" className="mt-6">
                  <Link href={hasAccount ? '/campaigns' : '/sign-up'}>
                    Explore Campaigns <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Card className="rounded-2xl">
                  <CardContent className="p-6">
                    <p className="font-figures text-3xl font-bold font-headline">
                      <CountUp value={activeCampaigns._count._all} />
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Active Campaigns</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl">
                  <CardContent className="p-6">
                    <p className="font-figures text-3xl font-bold font-headline text-gold">
                      KES <CountUp value={activeCampaigns._sum.raisedAmount ?? 0} />
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Total Raised</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold font-headline text-center mb-2">
              Choose your chama level
            </h2>
            <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
              Every chama picks a monthly contribution level at setup. Members contribute the
              same amount, month to month.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {CHAMA_LEVELS.map((level) => (
                <Card key={level.key} className="rounded-2xl">
                  <CardContent className="p-5">
                    <h3 className="font-headline font-semibold text-lg">{level.name}</h3>
                    <p className="mt-1 text-2xl font-bold text-primary">
                      {formatKES(level.monthlyAmount)}
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Up to {level.groupSize} members
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 border-t border-border">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-xl mx-auto">
              <h2 className="text-3xl font-bold font-headline">Ready to start your chama?</h2>
              <p className="mt-2 text-muted-foreground">
                {alreadyOnboarded
                  ? 'Head back to your chama dashboard.'
                  : hasAccount
                  ? 'Finish setting up your chama — pick a level and name your group.'
                  : "Sign up in minutes — you'll own the chama and can invite the rest right after."}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-4">
                {hasAccount ? (
                  <Button asChild size="lg">
                    <Link href={ctaHref}>
                      {alreadyOnboarded ? 'Go to My Chama' : 'Continue Setup'}{' '}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="lg">
                    <Link href="/sign-up">
                      Start a Chama <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <LChamaFooter />
    </div>
  );
}
