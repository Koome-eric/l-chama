import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MarketingShell, PageIntro } from '@/components/MarketingShell';
import { Button } from '@/components/ui/button';
import { ChamaLevelsShowcase } from '@/components/ChamaLevelsShowcase';
import { getLandingContext } from '@/lib/landing-context';

export const metadata = {
  title: 'Start a Chama | L-Chama',
  description: 'Create your chama in minutes: sign up, register your group, choose a monthly contribution level and invite members.',
};

const STEPS = [
  { title: 'Create your account', body: 'Sign up and complete your profile. You become the owner of the chama.' },
  { title: 'Register your group', body: 'Name your chama and choose the monthly contribution level every member will pay.' },
  { title: 'Get approved', body: 'Your registration is reviewed before the chama goes live.' },
  { title: 'Invite your members', body: 'Share an invite link. Each member joins with their own account.' },
];

export default async function StartPage() {
  const { hasAccount, ctaHref, alreadyOnboarded } = await getLandingContext();

  return (
    <MarketingShell>
      <PageIntro title="Start a chama">
        Sign up in minutes — you&apos;ll own the chama and can invite the rest right after.
      </PageIntro>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl border bg-card p-6">
                <p className="font-figures text-sm font-semibold text-primary-strong">Step {i + 1}</p>
                <h2 className="mt-1 font-headline font-semibold text-lg">{s.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href={hasAccount ? ctaHref : '/sign-up'}>
                {alreadyOnboarded ? 'Go to My Chama' : hasAccount ? 'Continue setup' : 'Start a chama'}{' '}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 border-t border-border/60">
        <div className="container mx-auto px-4">
          <h2 className="font-headline text-2xl font-bold mb-1.5">Choose your chama level</h2>
          <p className="text-sm text-muted-foreground max-w-xl mb-8">
            Every chama picks a monthly contribution level at setup. Members contribute the same amount,
            month to month.
          </p>
          <ChamaLevelsShowcase />
        </div>
      </section>
    </MarketingShell>
  );
}
