'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// Grounded in how the product actually works (guarantor loan flow, sheet-fed
// savings dashboard, per-chama data isolation, diaspora support) rather than
// generic SaaS filler — see /panel, /lib/chama.ts and /lib/chama-levels.ts.
const FAQS = [
  {
    q: 'How does a loan get approved?',
    a: 'Two other members guarantee your request, then your chama\u2019s officials approve it once the 2.5% processing fee is confirmed. There is no credit score. Interest is 2.5% a month for up to 6 months, repaid weekly.',
  },
  {
    q: 'What if a loan isn\u2019t repaid?',
    a: 'Guarantors are liable for the amount they signed for, and they can follow the repayment schedule week by week. Only guarantee what you could cover yourself.',
  },
  {
    q: 'Where do my dashboard numbers come from?',
    a: 'From the deposits and payouts your admin records, by hand or synced from your chama\u2019s savings sheet. Totals, charts and the leaderboard are all calculated from those entries.',
  },
  {
    q: 'Can members outside Kenya join?',
    a: 'Yes. Diaspora chamas work the same way, and reminders and reports take time zones into account.',
  },
  {
    q: 'Can another chama see my chama\u2019s money?',
    a: 'No. Each chama\u2019s members, loans and savings are visible only to that group.',
  },
  {
    q: 'Savings or investment products: which one?',
    a: 'Savings is for everyday group funds, with no lock-in. MMF and the Junior Account pay more but lock your money in for a set period.',
  },
  {
    q: 'What does it cost to start a chama?',
    a: 'Nothing. There is no signup fee. You pick a monthly contribution level, and every member pays that same amount each month.',
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
              Loans, savings and how your chama’s money is kept.
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
