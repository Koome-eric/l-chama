import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import LChamaHeader from '@/components/LChamaHeader';
import LChamaFooter from '@/components/LChamaFooter';
import { Button } from '@/components/ui/button';
import { HeroReveal, HeroRevealItem } from '@/components/motion/HeroReveal';
import { CountUp } from '@/components/motion/CountUp';
import { LandingFAQ } from '@/components/LandingFAQ';
import { getVisitorState } from '@/lib/landing-auth';
import { PRODUCTS, LOAN_INTEREST, PROCESSING_FEE, WITHDRAWAL_FEE } from '@/lib/landing-content';
import { RATES_EFFECTIVE } from '@/lib/legal';

const FEATURES = [
  {
    image: '/images/feature-ledger.svg',
    title: 'A ledger everyone can read',
    body: 'Contributions, reconciliation and remittance reminders are recorded automatically. Every member sees the same audit trail on one dashboard, so nobody keeps the books in a notebook.',
  },
  {
    image: '/images/feature-guarantee.svg',
    title: 'Loans your people vouch for',
    body: 'Loan approvals rest on guarantors from inside the chama and sign-off from your officials, not on a credit score.',
  },
  {
    image: '/images/feature-treasury.svg',
    title: 'One treasury for the whole group',
    body: 'Investment chamas, merry-go-rounds, welfare groups, diaspora chamas and bodaboda associations can pool deposits, manage liquidity and lend internally from one place.',
  },
];

const STEPS = [
  { title: 'Start your chama', body: 'Create an account, name the group and pick a monthly contribution level. There is no signup fee.' },
  { title: 'Invite your members', body: 'Send each member an invite link. They join with their phone number and see only your chama.' },
  { title: 'Save, guarantee, borrow', body: 'Members contribute each month. A loan needs two guarantors, then your officials approve it and funds are disbursed by M-Pesa.' },
];

// Headline figures for the "at a glance" strip. Product rates come straight
// from landing-content, so they match /products exactly.
const GLANCE = [
  ...PRODUCTS.filter((p) => p.rate).map((p) => ({
    label: p.name,
    figure: p.rate as string,
    note: 'per year',
  })),
  { label: 'Loan interest', figure: LOAN_INTEREST, note: 'per month, up to 6 months' },
  { label: 'Loan processing fee', figure: PROCESSING_FEE, note: 'once, on the loan amount' },
  { label: 'Withdrawal fee', figure: WITHDRAWAL_FEE, note: 'external chamas; no other hidden charges' },
];

const EXPLORE = [
  { title: 'Products and rates', body: 'Savings, MMF, junior accounts and last expense cover, with the rate and its effective date.', href: '/products' },
  { title: 'Loans', body: 'Terms, fees and how guarantors work, stated plainly before you sign up.', href: '/loans' },
  { title: 'Fundraising', body: 'Start or support a community campaign for welfare, medical costs or education.', href: '/fundraising' },
  { title: 'Diaspora chamas', body: 'Contribute, guarantee and vote from another country or time zone.', href: '/diaspora' },
];

export default async function LandingPage() {
  const { hasAccount, ctaHref, alreadyOnboarded } = await getVisitorState();

  const [poolTotal, activeChamaCount] = await Promise.all([
    prisma.loanAccount.aggregate({ _sum: { balance: true } }),
    prisma.team.count({ where: { approvalStatus: 'APPROVED' } }),
  ]);
  const totalPooled = poolTotal._sum.balance ?? 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LChamaHeader />
      <main className="flex-1">
        {/* HERO — three clear entry choices on the left, a sample ledger on the right */}
        <section className="relative overflow-hidden bg-fintech-mesh">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <HeroReveal>
              <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
                <div>
                  <HeroRevealItem>
                    <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.06] tracking-tight">
                      Your chama&apos;s money, on the record.
                    </h1>
                  </HeroRevealItem>
                  <HeroRevealItem>
                    <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                      Collect monthly contributions, guarantee each other&apos;s loans and see every shilling in one shared ledger.
                    </p>
                  </HeroRevealItem>

                  <HeroRevealItem className="mt-8 max-w-xl">
                    {hasAccount ? (
                      <Button asChild size="lg">
                        <Link href={ctaHref}>
                          {alreadyOnboarded ? 'Go to my chama' : 'Continue setup'} <ArrowRight />
                        </Link>
                      </Button>
                    ) : (
                      <ul className="divide-y rounded-2xl border bg-card/80 backdrop-blur-sm">
                        {[
                          { t: 'Start a chama', d: 'Set up your group in minutes, free.', href: '/start', primary: true },
                          { t: 'Join my chama', d: 'Already invited? Paste your invite link.', href: '/join' },
                          { t: 'Explore products', d: 'Savings, MMF, junior accounts, cover and loans.', href: '/products' },
                        ].map((o) => (
                          <li key={o.t}>
                            <Link
                              href={o.href}
                              className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-primary/[0.04] first:rounded-t-2xl last:rounded-b-2xl"
                            >
                              <span>
                                <span className={`block font-headline text-lg font-semibold ${o.primary ? 'text-primary' : ''}`}>{o.t}</span>
                                <span className="block text-sm text-muted-foreground">{o.d}</span>
                              </span>
                              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </HeroRevealItem>

                  {totalPooled > 0 && (
                    <HeroRevealItem className="mt-6">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-figures font-semibold text-foreground">KES <CountUp value={totalPooled} /></span>{' '}
                        pooled across {activeChamaCount} chama{activeChamaCount === 1 ? '' : 's'}
                      </p>
                    </HeroRevealItem>
                  )}
                </div>

                <HeroRevealItem className="relative">
                  <HeroVisual />
                </HeroRevealItem>
              </div>
            </HeroReveal>
          </div>
        </section>

        {/* Plain-fact trust strip — no borrowed logos */}
        <section aria-label="Who is behind L-Chama" className="border-y bg-card">
          <div className="container mx-auto px-4 py-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-2 text-sm text-muted-foreground">
            <span>Built and run by <strong className="text-foreground">Ludeva Plc</strong></span>
            <span>Deposits and loans paid by <strong className="text-foreground">M-Pesa</strong></span>
            <span>Each chama&apos;s data is <strong className="text-foreground">kept separate</strong></span>
            <span>Members in Kenya and <strong className="text-foreground">abroad</strong></span>
          </div>
        </section>

        {/* WHAT IT DOES */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 className="font-headline text-3xl md:text-4xl font-bold max-w-2xl leading-tight">
              Everything a chama does by hand, done in the open.
            </h2>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title}>
                  <Image
                    src={f.image}
                    alt=""
                    width={640}
                    height={420}
                    className="w-full h-auto rounded-3xl border"
                  />
                  <h3 className="mt-6 font-headline text-xl font-semibold">{f.title}</h3>
                  <p className="mt-3 text-muted-foreground leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS — a true sequence, so numbered */}
        <section id="how-it-works" className="bg-brand-dark py-16 md:py-24 scroll-mt-16">
          <div className="container mx-auto px-4">
            <h2 className="font-headline text-3xl md:text-4xl font-bold max-w-xl leading-tight">
              From first signup to first loan.
            </h2>
            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map((st, i) => (
                <li key={st.title} className="rounded-2xl border border-white/15 bg-white/[0.04] p-6">
                  <span className="font-figures text-4xl font-bold text-gold">{i + 1}</span>
                  <h3 className="mt-4 font-headline text-xl font-semibold">{st.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">{st.body}</p>
                </li>
              ))}
            </ol>
            <Button asChild size="lg" className="mt-10 bg-white text-[hsl(224_71%_4%)] hover:bg-white/90">
              <Link href={hasAccount ? ctaHref : '/sign-up'}>
                {alreadyOnboarded ? 'Go to my chama' : 'Start a chama'} <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>

        {/* RATES AND FEES — the headline figures, up front */}
        <section aria-labelledby="rates-heading" className="border-y bg-card py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 id="rates-heading" className="font-headline text-3xl md:text-4xl font-bold max-w-2xl leading-tight">
              Rates and fees, up front.
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Rates effective {RATES_EFFECTIVE}. They are annual, indicative and not guaranteed, and can change.
            </p>
            <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {GLANCE.map((g) => (
                <div key={g.label} className="rounded-2xl border bg-background p-6">
                  <dt className="text-sm text-muted-foreground">{g.label}</dt>
                  <dd className="mt-2 font-figures font-headline text-3xl font-bold">{g.figure}</dd>
                  <dd className="mt-1 text-sm text-muted-foreground">{g.note}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium">
              <Link href="/products" className="inline-flex items-center gap-1.5 text-primary hover:underline underline-offset-4">
                All products and rates <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/loans" className="inline-flex items-center gap-1.5 text-primary hover:underline underline-offset-4">
                Loan terms and fees <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* EXPLORE — detail lives on dedicated pages */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 className="font-headline text-3xl md:text-4xl font-bold max-w-xl leading-tight">
              More to explore.
            </h2>
            <ul className="mt-10 divide-y rounded-2xl border bg-card">
              {EXPLORE.map((x) => (
                <li key={x.href}>
                  <Link href={x.href} className="group flex items-center justify-between gap-6 px-6 py-5 transition-colors hover:bg-primary/[0.04]">
                    <span>
                      <span className="block font-headline text-xl font-semibold group-hover:text-primary transition-colors">{x.title}</span>
                      <span className="mt-1 block text-sm text-muted-foreground max-w-xl">{x.body}</span>
                    </span>
                    <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div id="faq" className="scroll-mt-16">
          <LandingFAQ />
        </div>

        {/* CLOSING CTA */}
        <section className="bg-brand-dark py-16 md:py-24">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <h2 className="font-headline text-3xl md:text-4xl font-bold leading-tight">Ready to put your chama on the record?</h2>
            <p className="mt-4 text-white/75">
              {alreadyOnboarded
                ? 'Head back to your chama dashboard.'
                : hasAccount
                  ? 'Finish setting up: pick a level and name your group.'
                  : 'Sign up in minutes. You own the chama and can invite everyone else right after.'}
            </p>
            <Button asChild size="lg" className="mt-8 bg-white text-[hsl(224_71%_4%)] hover:bg-white/90">
              <Link href={hasAccount ? ctaHref : '/sign-up'}>
                {alreadyOnboarded ? 'Go to my chama' : hasAccount ? 'Continue setup' : 'Start a chama'} <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <LChamaFooter />
    </div>
  );
}

// Hero artwork: an original illustration of a chama (a group of members, a
// shield for the guaranteed loans, coins for the pooled savings) with a small
// floating ledger card on top. The card is static, clearly labelled sample
// data, so the hero never depends on live (possibly zero) numbers.
function HeroVisual() {
  const rows = [
    { who: 'Wanjiru K.', what: 'Monthly contribution', amt: '+ 5,000' },
    { who: 'Peter M.', what: 'Loan repayment, week 3', amt: '+ 4,200' },
  ];
  return (
    <div className="relative mx-auto w-full max-w-lg pb-16 sm:pb-12" aria-label="Illustration of a chama with a sample ledger">
      <Image
        src="/images/hero-chama.svg"
        alt="Members of a chama gathered around a shield with a check mark, surrounded by coins"
        width={960}
        height={760}
        priority
        className="w-full h-auto rounded-[2rem] shadow-2xl shadow-primary/20"
      />
      <div className="absolute -bottom-2 left-3 right-3 sm:left-auto sm:-right-6 sm:w-80 overflow-hidden rounded-2xl border bg-card shadow-xl">
        <div className="flex items-end justify-between gap-3 bg-brand-dark px-5 py-3.5">
          <div>
            <p className="text-xs text-white/70">Sunrise Chama · 12 members</p>
            <p className="mt-0.5 font-figures text-2xl font-bold">KES 85,000</p>
          </div>
          <p className="text-xs text-white/60">Savings this cycle</p>
        </div>
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.who} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <span>
                <span className="block text-sm font-medium">{r.who}</span>
                <span className="block text-xs text-muted-foreground">{r.what}</span>
              </span>
              <span className="font-figures text-sm font-semibold text-primary">{r.amt}</span>
            </li>
          ))}
        </ul>
        <p className="border-t bg-muted/40 px-5 py-2 text-[11px] text-muted-foreground">Sample data for illustration</p>
      </div>
    </div>
  );
}
