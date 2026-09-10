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
import { HeroReveal, HeroRevealItem } from '@/components/motion/HeroReveal';
import { CountUp } from '@/components/motion/CountUp';
import { ChamaLevelsShowcase } from '@/components/ChamaLevelsShowcase';
import { LandingFAQ } from '@/components/LandingFAQ';

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

// Product rate card — what each L-Chama product offers, at a glance,
// and which authenticated page it should send a member to. Kept to
// exactly these 3 investment products at the client's request — Last
// Expense Cover and Micro Loans are still fully live in the app (nav,
// /panel, /last-respect), just not listed as "investment products" here.
const PRODUCTS = [
  {
    name: 'Junior Account',
    rate: '6%',
    description: "High-interest custodial savings designed to secure members' children's future education goals.",
    features: 'Lock-in savings triggers, automatic parent-to-child recurring standing orders, and milestone rewards.',
    target: '/accounts?open=junior',
  },
  {
    name: 'MMF',
    rate: '9% – 13%',
    description: 'Maximize returns on capital through money market fund investment.',
    features: 'Daily interest compounding, automated interest generation, and a minimum lock-in of 12 months.',
    target: '/invest?type=MMF',
  },
  {
    name: 'Savings Account',
    rate: '5% – 7%',
    description: 'Flexible, liquidity-focused account for operational group funds.',
    features: 'Tiered interest rates based on average monthly balance, no lock-in period, and zero monthly ledger fees.',
    target: '/savings',
  },
  {
    name: 'Last Expense Cover',
    rate: null,
    description: 'Flexible cover limits for groups.',
    features: 'KES 50,000 to KES 500,000 per member of the group, plus a small additional fee to cover non-members (e.g. spouse and dependents).',
    target: '/last-respect',
  },
  {
    name: 'L-Chama Micro Loans',
    rate: '2.5% p.m.',
    description: 'Internal chama loans — members borrow against their savings with automated interest tracking and instant M-Pesa disbursement.',
    features: 'Zero paperwork — every decision and approval happens within your L-Chama. KES 50,000 to KES 500,000 per member of the group, plus a small additional fee for non-member borrowers (e.g. spouse and dependents).',
    target: '/panel?tab=loan-requests',
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

  // Signed-out visitor → sign up, carrying the target product through so
  // CaptureAuthRedirect/PostAuthRedirect land them there once onboarded.
  // Signed in and fully onboarded → straight to the product. Signed in
  // but still mid-onboarding → continue onboarding first.
  const productHref = (target: string) =>
    !hasAccount
      ? `/sign-up?redirect_url=${encodeURIComponent(target)}`
      : alreadyOnboarded
        ? target
        : ctaHref;

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
            <h2 className="text-3xl font-bold font-headline text-center mb-2">
              Products &amp; Rates
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
              Every L-Chama comes with a full suite of products — investment, savings, cover, and
              credit — all managed from the same dashboard.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              {PRODUCTS.map((p) => (
                <Link key={p.name} href={productHref(p.target)} className="group block">
                  <Card className="rounded-2xl h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/40">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-headline font-semibold text-lg group-hover:text-primary transition-colors">
                          {p.name}
                        </h3>
                        {p.rate && (
                          <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                            {p.rate}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.description}</p>
                      <p className="mt-3 text-sm leading-relaxed border-t pt-3">{p.features}</p>
                      <p className="mt-3 text-sm font-medium text-primary flex items-center gap-1">
                        Invest now <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
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

        <section className="py-10 md:py-14">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold font-headline text-center mb-1.5">
              Choose your chama level
            </h2>
            <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto mb-8">
              Every chama picks a monthly contribution level at setup. Members contribute the
              same amount, month to month.
            </p>
            <ChamaLevelsShowcase />
          </div>
        </section>

        <LandingFAQ />

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
