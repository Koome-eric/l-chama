import { prisma } from '@/lib/prisma';
import { requirePanelAccess } from '@/lib/require-panel-access';
import { SavingsClient } from './SavingsClient';

export default async function SavingsPage() {
  const { user } = await requirePanelAccess('/savings');

  const entries = user.email
    ? await prisma.savingsEntry.findMany({
        where: { memberEmail: user.email.toLowerCase() },
        orderBy: [{ date: 'asc' }, { uploadedAt: 'asc' }],
      })
    : [];

  const latest = entries[entries.length - 1];

  const data = {
    balance: latest?.closingBalance ?? null,
    asOf: latest?.periodLabel || latest?.date || null,
    entries: entries
      .slice()
      .reverse()
      .map((e) => ({
        id: e.id,
        date: e.date,
        periodLabel: e.periodLabel,
        openingBalance: e.openingBalance,
        deposit: e.deposit,
        payout: e.payout,
        closingBalance: e.closingBalance,
        notes: e.notes,
      })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Savings Account</h1>
        <p className="text-muted-foreground">
          Your L-Chama Savings Account — a running balance separate from your Investments,
          updated each period from your deposits and payouts. No interest is calculated here;
          interest is reserved for members who hold a Ludeva Investment Account.
        </p>
      </div>
      <SavingsClient data={data} />
    </div>
  );
}
