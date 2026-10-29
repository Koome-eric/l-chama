import Link from 'next/link';
import { PublicPage } from '@/components/PublicPage';
import { LEGAL_LAST_UPDATED, LEGAL_ENTITY } from '@/lib/legal';

export const metadata = { title: 'Terms of Service — L-Chama' };

// Written from how the platform actually works (see /loans, /products and the
// FAQ). Ludeva's legal team must review and approve this text before launch.
const TERMS = [
  {
    h: 'Who we are',
    p: [
      `L-Chama is a product of ${LEGAL_ENTITY}, Kenya. In these terms, "we" and "us" mean ${LEGAL_ENTITY}, and "you" means anyone who creates an account or uses L-Chama.`,
    ],
  },
  {
    h: 'Accounts and membership',
    p: [
      'You must give accurate details when you sign up and keep them up to date. You are responsible for activity under your account.',
      'A chama is created by its owner, who picks a monthly contribution level. Members contribute the same amount each month. The owner and any officials the owner appoints can invite members and approve requests.',
    ],
  },
  {
    h: 'Contributions, savings and products',
    p: [
      'Contributions and deposits are recorded on your chama’s ledger. Rates shown on our products page are annual, indicative and not guaranteed, and they carry an effective date.',
      'Some products have lock-in periods, for example a minimum of 12 months for MMF. You agree to the conditions shown for a product before you invest.',
    ],
  },
  {
    h: 'Loans and guarantees',
    p: [
      'Loans are made from your chama’s shared loan account. Each loan needs two member guarantors and approval from your chama’s officials. A 2.5% processing fee is charged once on the loan amount, and interest is 2.5% per month, with repayment over up to 6 months.',
      'A guarantor is personally liable up to the amount they signed for if the borrower does not repay.',
    ],
  },
  {
    h: 'Fees',
    p: [
      'A flat 5% platform fee applies to standard withdrawals, including campaign fund withdrawals, for external chamas (chamas not built directly by Ludeva Plc). Chamas built directly by Ludeva Plc follow the Second Cycle Withdrawal Policy and are exempt. Standard withdrawals need 24 hours’ notice.',
    ],
  },
  {
    h: 'Fundraising campaigns',
    p: [
      'Anyone with a campaign link can give without an account. Campaign organisers are responsible for using funds for the purpose they described.',
    ],
  },
  {
    h: 'Acceptable use',
    p: [
      'Do not use L-Chama for fraud, money laundering, to impersonate another person, or to access another chama’s data. We may suspend an account that breaks these terms.',
    ],
  },
  {
    h: 'Complaints',
    p: [
      'Tell us about a problem through the contact page. We will acknowledge your complaint and tell you how we are handling it.',
    ],
  },
  {
    h: 'Changes to these terms',
    p: ['We will update the date at the top of this page when these terms change.'],
  },
];

export default function TermsPage() {
  return (
    <PublicPage
      title="Terms of Service"
      intro="The rules for using L-Chama, in plain language. Please read them before you create an account."
      meta={`Last updated ${LEGAL_LAST_UPDATED}. Read alongside our Privacy Policy.`}
    >
      <div className="max-w-3xl space-y-10">
        {TERMS.map((t) => (
          <section key={t.h}>
            <h2 className="font-headline text-xl font-semibold">{t.h}</h2>
            {t.p.map((para) => (
              <p key={para} className="mt-3 leading-relaxed text-muted-foreground">{para}</p>
            ))}
          </section>
        ))}
        <p className="text-sm text-muted-foreground">
          How we handle your data is in our <Link href="/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
          Questions? <Link href="/contact" className="underline hover:text-primary">Contact us</Link>.
        </p>
      </div>
    </PublicPage>
  );
}
