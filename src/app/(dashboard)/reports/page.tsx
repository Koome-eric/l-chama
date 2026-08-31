import { TrendingUp, Users, Wallet, HandCoins, CheckCircle2, Clock, PiggyBank } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requirePanelAccess } from '@/lib/require-panel-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CountUp } from '@/components/motion/CountUp';

export default async function ReportsPage() {
  const { ctx } = await requirePanelAccess('/reports');

  const [loanAccount, loanRequests, investments, memberReports] = await Promise.all([
    prisma.loanAccount.findUnique({ where: { teamId: ctx.team.id } }),
    prisma.loanRequest.findMany({
      where: { teamId: ctx.team.id },
      include: { repayments: true },
    }),
    prisma.teamInvestment.findMany({
      where: { teamId: ctx.team.id },
      include: { product: true },
    }),
    prisma.memberReport.findMany({
      where: { teamId: ctx.team.id },
      orderBy: { uploadedAt: 'desc' },
      take: 25,
    }),
  ]);

  const memberCount = ctx.team.members.length + 1; // +1 for the owner
  const activeOrRepaid = loanRequests.filter(
    (r: (typeof loanRequests)[number]) => r.status === 'ACTIVE' || r.status === 'REPAID'
  );
  const totalIssued = activeOrRepaid.reduce(
    (sum: number, r: (typeof activeOrRepaid)[number]) => sum + r.amount,
    0
  );

  let totalRepaid = 0;
  let outstanding = 0;
  for (const r of activeOrRepaid) {
    for (const rp of r.repayments) {
      if (rp.paid) totalRepaid += rp.amount;
      else outstanding += rp.amount;
    }
  }

  const pendingCount = loanRequests.filter(
    (r: (typeof loanRequests)[number]) => r.status === 'PENDING_GUARANTORS' || r.status === 'PENDING_ADMIN'
  ).length;

  const totalInvested = investments
    .filter((i: (typeof investments)[number]) => i.status === 'ACTIVE')
    .reduce((sum: number, i: (typeof investments)[number]) => sum + i.amount, 0);

  const stats = [
    { label: 'Members', value: memberCount, isMoney: false, icon: Users },
    { label: 'Loan Account Balance', value: loanAccount?.balance ?? 0, isMoney: true, icon: Wallet },
    { label: 'Invested in Products', value: totalInvested, isMoney: true, icon: PiggyBank },
    { label: 'Total Loans Issued', value: totalIssued, isMoney: true, icon: HandCoins },
    { label: 'Total Repaid', value: totalRepaid, isMoney: true, icon: CheckCircle2 },
    { label: 'Outstanding Balance', value: outstanding, isMoney: true, icon: TrendingUp },
    { label: 'Pending Requests', value: pendingCount, isMoney: false, icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground">A snapshot of {ctx.team.name}'s savings and loan activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card
            key={s.label}
            className="rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>{s.label}</CardDescription>
              <s.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <CardTitle className="font-figures text-2xl">
                {s.isMoney && 'KES '}
                <CountUp value={s.value} />
              </CardTitle>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>What's in these numbers</CardTitle>
          <CardDescription>
            Loans Issued and Repaid cover loans that reached ACTIVE or REPAID status. Outstanding
            Balance is the sum of unpaid weekly repayments across those loans. Invested in Products
            is the chama's current balance across active entries on the Invest page. Detailed,
            downloadable reports are on the way — for a full breakdown by member, see Team Members
            and Transactions.
          </CardDescription>
        </CardHeader>
      </Card>

      {memberReports.length > 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Member Performance</CardTitle>
            <CardDescription>Synced in from Google Sheets by your admin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {memberReports.map((r: (typeof memberReports)[number]) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">{r.memberName || r.memberEmail}</p>
                  <p className="text-muted-foreground">
                    {r.periodLabel || r.date || '—'} · Principal {r.principal || '—'} · ROI {r.roi || '—'}
                  </p>
                </div>
                {r.closingBal && <Badge variant="secondary">Closing: {r.closingBal}</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
