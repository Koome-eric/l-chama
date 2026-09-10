'use client';

import { PiggyBank, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CountUp } from '@/components/motion/CountUp';

type SavingsEntryRow = {
  id: string;
  date: string | null;
  periodLabel: string | null;
  openingBalance: string | null;
  deposit: string | null;
  payout: string | null;
  closingBalance: string | null;
  notes: string | null;
};

type SavingsData = {
  balance: string | null;
  asOf: string | null;
  entries: SavingsEntryRow[];
};

// Stored figures are plain strings (same convention as MemberReport) since
// they're pasted or pushed in verbatim from the Savings Data sheet. Parse
// loosely for the animated headline; fall back to the raw string if it
// isn't a clean number (e.g. already formatted with commas or a currency
// prefix).
function toNumber(value: string | null): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function SavingsClient({ data }: { data: SavingsData }) {
  const balanceNum = toNumber(data.balance);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardDescription>Current Balance</CardDescription>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <PiggyBank className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <CardTitle className="font-figures text-3xl">
            {balanceNum !== null ? (
              <>KES <CountUp value={balanceNum} /></>
            ) : (
              data.balance || 'No entries yet'
            )}
          </CardTitle>
          {data.asOf && <p className="mt-1 text-sm text-muted-foreground">As of {data.asOf}</p>}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Each entry carries forward the previous closing balance, adds any deposit, subtracts
            any payout. No interest is calculated — interest is reserved for members who hold a
            Ludeva Investment Account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.entries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <Wallet className="h-8 w-8 text-muted-foreground/50" />
              <p>No savings entries yet. Your admin will add these as your account is updated.</p>
            </div>
          ) : (
            data.entries.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">{e.periodLabel || e.date || '—'}</p>
                  <p className="text-muted-foreground">
                    Opening {e.openingBalance || '—'}
                    {e.deposit ? ` · Deposit ${e.deposit}` : ''}
                    {e.payout ? ` · Payout ${e.payout}` : ''}
                  </p>
                  {e.notes && <p className="text-xs text-muted-foreground/80 mt-0.5">{e.notes}</p>}
                </div>
                {e.closingBalance && <Badge variant="secondary">Closing: {e.closingBalance}</Badge>}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
