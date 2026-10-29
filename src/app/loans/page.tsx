import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PublicPage } from '@/components/PublicPage';
import { Button } from '@/components/ui/button';
import { LOAN_TERMS, LOAN_STEPS } from '@/lib/landing-content';
import { getVisitorState } from '@/lib/landing-auth';

export const metadata = { title: 'Loans — L-Chama' };

export default async function LoansPage() {
  const { hasAccount } = await getVisitorState();

  return (
    <PublicPage
      title="L-Chama loans"
      art="/images/art-loans.svg"
      intro="Borrow against your chama's own pooled savings. Your people guarantee the loan, so there is no credit score and no outside paperwork."
    >
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border bg-card">
          <h2 className="border-b bg-muted/50 px-6 py-4 font-headline font-semibold">Loan terms for external chamas</h2>
          <dl className="divide-y">
            {LOAN_TERMS.map((t) => (
              <div key={t.label} className="flex items-center justify-between gap-4 px-6 py-4">
                <dt className="text-sm text-muted-foreground">{t.label}</dt>
                <dd className="text-right text-sm font-semibold">{t.value}</dd>
              </div>
            ))}
          </dl>
          <div className="border-t-2 border-gold/40 bg-gold/10 px-6 py-5">
            <p className="font-headline font-semibold">Platform withdrawal fee: 5%</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              A flat 5% fee applies to standard withdrawals, including campaign fund withdrawals, for external chamas
              (chamas not built directly by Ludeva Plc). There are no other hidden charges.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Chamas built directly by Ludeva Plc follow the Second Cycle Withdrawal Policy and are exempt. Standard
              withdrawals need 24 hours&apos; notice.
            </p>
          </div>
        </div>

        <div>
          <h2 className="font-headline text-2xl font-bold">How a loan is approved</h2>
          <ol className="mt-5 space-y-4">
            {LOAN_STEPS.map((s, i) => (
              <li key={s} className="flex gap-4">
                <span className="font-figures flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <p className="pt-1 text-muted-foreground">{s}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 rounded-2xl border bg-card p-5">
            <h3 className="font-headline font-semibold">If a loan is not repaid</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Guarantors are personally liable up to the amount they signed for. Guarantors see the full repayment
              schedule. Only guarantee what you could cover yourself.
            </p>
          </div>
          <Button asChild size="lg" className="mt-8">
            <Link href={hasAccount ? '/panel?tab=loan-requests' : '/sign-up'}>
              {hasAccount ? 'Request a loan' : 'Start a chama to borrow'} <ArrowRight />
            </Link>
          </Button>
          <p className="mt-3 text-sm text-muted-foreground">
            Questions about fees or defaults? Read the <Link href="/terms" className="underline hover:text-primary">terms</Link> or{' '}
            <Link href="/contact" className="underline hover:text-primary">contact us</Link>.
          </p>
        </div>
      </div>
    </PublicPage>
  );
}
