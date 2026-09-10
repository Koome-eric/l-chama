'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// Grounded in how the product actually works (guarantor loan flow, sheet-fed
// savings dashboard, per-chama data isolation, diaspora support) rather than
// generic SaaS filler — see /panel, /lib/chama.ts and /lib/chama-levels.ts.
const FAQS = [
  {
    q: 'How does a loan actually get approved?',
    a: "No credit score — your chama vouches for you instead. A loan request needs two other members to guarantee it, each signing with their typed full name. Once a 2.5% processing fee is confirmed received, your Team Leader (or anyone with approval permission) approves it and funds move from the shared loan account. Interest is fixed at 2.5% per month, capped at 6 months, repaid weekly.",
  },
  {
    q: 'What happens if a loan isn\u2019t repaid?',
    a: 'Guarantors are personally liable up to the amount they signed for, which is why guarantors see the full repayment schedule and can track it week by week. It keeps underwriting social rather than paper-based, but it also means only guarantee what you\u2019d be able to cover yourself.',
  },
  {
    q: 'Where do my savings numbers on the dashboard come from?',
    a: 'Every deposit and payout entry your admin records \u2014 by hand or synced from your chama\u2019s Savings Data sheet \u2014 rolls straight into your dashboard: total funds, the milestone bar, the funds-growth chart, and the contributor leaderboard. Nothing on there is a placeholder; it\u2019s all computed from those entries.',
  },
  {
    q: 'Can members outside Kenya join?',
    a: 'Yes. Diaspora chamas run the same way, just flagged on your chama profile so contribution reminders and reporting account for members spread across time zones.',
  },
  {
    q: 'Is one chama\u2019s money ever visible to another?',
    a: 'No. Each chama\u2019s membership, permissions, loan account and savings entries are scoped to that team only \u2014 members and admins can only ever see the group they belong to.',
  },
  {
    q: 'What\u2019s the difference between Savings and the investment products?',
    a: 'Savings Account is your chama\u2019s day-to-day operating fund \u2014 flexible, no lock-in, tiered interest on the average balance. MMF and the Junior Account are longer-horizon products with their own lock-in periods and higher rates, for capital your chama isn\u2019t touching month to month.',
  },
  {
    q: 'How much does it cost to start a chama?',
    a: 'There\u2019s no signup fee. Every chama picks a monthly contribution level at setup \u2014 members contribute the same amount each month \u2014 and that level is what determines your chama\u2019s tier, not a platform charge.',
  },
] as const;

export function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-16 md:py-24 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <h2 className="text-3xl font-bold font-headline leading-tight">
              Questions, answered plainly.
            </h2>
            <p className="mt-3 text-muted-foreground max-w-sm">
              How the loan guarantees, the savings dashboard, and the rest of L-Chama actually
              work under the hood.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm divide-y divide-border/60 overflow-hidden">
            {FAQS.map((item, i) => {
              const open = openIndex === i;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? null : i)}
                    aria-expanded={open}
                    className="w-full flex items-center justify-between gap-4 text-left px-6 py-5 hover:bg-primary/[0.03] transition-colors"
                  >
                    <span className="font-headline font-medium text-base sm:text-lg">{item.q}</span>
                    <Plus
                      className={cn(
                        'h-5 w-5 shrink-0 text-primary transition-transform duration-300',
                        open && 'rotate-45'
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      'grid transition-all duration-300 ease-out',
                      open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
