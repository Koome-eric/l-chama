import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@clerk/nextjs/server';
import { ArrowRight, ShieldCheck, HeartHandshake, ClipboardCheck, Landmark, Percent, Clock, Headset, FileCheck2, Banknote, HandCoins, LineChart, Globe2 } from 'lucide-react';
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
    features: '2.5% one-off processing fee on the loan amount, repayment over up to 6 months, and disbursement as soon as your chama officials approve it.',
    target: '/panel?tab=loan-requests',
  },
];

// L-Chama Loans terms — kept as plain data (not prose) specifically so
// the platform fee is never buried in a paragraph; see the dedicated
// "L-Chama Loans" section below.
const LOAN_TERMS = [
  { label: 'Interest Rate', value: '2.5% per month' },
  { label: 'Processing Fee', value: '2.5% one-off, on the total loan amount' },
  { label: 'Repayment Term', value: 'Up to 6 months' },
];

const LOAN_BENEFITS = [
  { icon: ShieldCheck, text: 'Fund security guarantees, with a full audit trail on a shared dashboard.' },
  { icon: FileCheck2, text: 'Automated payment processing and quick disbursement once your chama officials approve.' },
  { icon: Clock, text: '24-hour advance notice for standard withdrawals.' },
  { icon: Headset, text: '24/7 dedicated L-Chama customer support.' },
];

// For chamas whose members are spread across countries and time zones —
// see /contact's "Diaspora Team Leads" for the human contact side of this.
const DIASPORA_BENEFITS = [
  {
    icon: Banknote,
    title: 'Multi-Currency Global Gateway & Auto-FX',
    body: "Fund your chama with the payment rails you already use — ACH/Wire in the USA, SEPA in Europe, Instant Pay/Cards in the UAE and Australia, or M-Pesa/Airtel Money in Africa. Real-time mid-market FX shows exactly what your contribution converts to, and everything reconciles automatically into one clean group balance.",
  },
  {
    icon: HandCoins,
    title: 'Cross-Border "Cheap Loan" & Guarantee Matrix',
    body: 'Diaspora members or their local proxies and families can apply for low-interest development or emergency loans. A digital Guarantee Lock lets designated members in different time zones sign off and lock a portion of their savings as collateral with a single tap.',
  },
  {
    icon: LineChart,
    title: 'Global Investment Portfolio Tracker',
    body: "Direct plug-ins into high-yield local investment vehicles — MMFs, Treasury Bonds, and vetted real estate — with a live dashboard for portfolio growth, dividends, and each member's share, visible 24/7 wherever you're checking in from.",
  },
  {
    icon: Globe2,
    title: 'Async Governance & Time-Zone-Friendly Voting',
    body: "A chama spanning Sydney, Dubai, London, and Nairobi can't all be online at once. Admins set a voting window — say, 48 hours — for loan approvals or investment moves, so members review, ask questions, and vote whenever they wake up.",
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

        {/* L-Chama Loans — kept as its own detailed section (rather than
            folded into a product-grid card) specifically so the platform
            fee is stated plainly, not buried in marketing copy. */}
        <section className="py-16 md:py-24 border-y border-border/60">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-10 items-start">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  <Landmark className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-3xl font-bold font-headline">L-Chama Loans</h2>
                <p className="mt-3 text-muted-foreground">
                  Borrow against your chama's own pooled savings — every decision happens inside your L-Chama,
                  with no external paperwork.
                </p>

                <ul className="mt-6 space-y-3">
                  {LOAN_BENEFITS.map((b) => (
                    <li key={b.text} className="flex items-start gap-3 text-sm">
                      <b.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{b.text}</span>
                    </li>
                  ))}
                </ul>

                <Button asChild size="lg" className="mt-6">
                  <Link href={hasAccount ? '/panel?tab=loan-requests' : '/sign-up'}>
                    Apply for a Loan <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b bg-muted/40">
                  <p className="font-headline font-semibold">Loan Terms — External Chamas</p>
                </div>
                <dl className="divide-y">
                  {LOAN_TERMS.map((t) => (
                    <div key={t.label} className="flex items-center justify-between gap-4 px-6 py-4">
                      <dt className="text-sm text-muted-foreground">{t.label}</dt>
                      <dd className="text-sm font-semibold text-right">{t.value}</dd>
                    </div>
                  ))}
                </dl>

                {/* Platform withdrawal fee — deliberately its own highlighted
                    block, not just another row, per the "as clear as
                    possible" requirement. */}
                <div className="px-6 py-5 bg-primary/5 border-t-2 border-primary/30">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-primary shrink-0" />
                    <p className="font-headline font-semibold">Platform Withdrawal Fee: 5%</p>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    A flat 5% platform fee applies to all standard withdrawals — including campaign fund
                    withdrawals — for external chamas (chamas not built directly by Ludeva Plc). There are no other
                    hidden charges.
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Chamas built directly by Ludeva Plc operate under the Second Cycle Withdrawal Policy and are
                    exempt from this fee — see{' '}
                    <Link href="/privacy" className="underline hover:text-primary">
                      our policies
                    </Link>{' '}
                    or{' '}
                    <Link href="/contact" className="underline hover:text-primary">
                      contact us
                    </Link>{' '}
                    for details.
                  </p>
                </div>
              </div>
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

        <section className="py-16 md:py-24 bg-fintech-mesh border-y border-border/60">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Globe2 className="h-4 w-4" /> Built for the Diaspora
            </div>
            <h2 className="text-3xl font-bold font-headline text-center mb-2">
              Run your chama from anywhere in the world
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
              Whether your members are in Dallas, Dubai, London, or Nairobi, L-Chama keeps
              contributions, loans, and votes on one shared, time-zone-friendly dashboard — no
              more chasing spreadsheets across group chats.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              {DIASPORA_BENEFITS.map((b) => (
                <Card
                  key={b.title}
                  className="rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/30"
                >
                  <CardContent className="p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <b.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mt-3 font-headline font-semibold text-lg">{b.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{b.body}</p>
                  </CardContent>
                </Card>
              ))}
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
