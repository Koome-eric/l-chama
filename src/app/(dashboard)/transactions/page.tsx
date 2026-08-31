import { Repeat } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requirePanelAccess } from '@/lib/require-panel-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatKES } from '@/lib/chama-levels';

export default async function TransactionsPage() {
  const { ctx } = await requirePanelAccess('/transactions');

  // There's no dedicated ledger model yet, so "transactions" is built
  // from the two things that actually move money today: loan requests
  // going active, and the weekly repayments against them.
  const loanRequests = await prisma.loanRequest.findMany({
    where: { teamId: ctx.team.id },
    include: { requester: true, repayments: true },
    orderBy: { createdAt: 'desc' },
  });

  type Row = {
    id: string;
    date: Date;
    description: string;
    amount: number;
    direction: 'out' | 'in';
    status: string;
  };

  const rows: Row[] = [];

  for (const req of loanRequests) {
    if (req.status === 'ACTIVE' || req.status === 'REPAID') {
      rows.push({
        id: `${req.id}-disbursed`,
        date: req.decidedAt ?? req.createdAt,
        description: `Loan disbursed to ${req.requester.fullName || req.requester.email}`,
        amount: req.amount,
        direction: 'out',
        status: 'Disbursed',
      });
    }
    for (const rp of req.repayments) {
      if (rp.paid) {
        rows.push({
          id: rp.id,
          date: rp.paidAt ?? rp.dueDate,
          description: `Repayment (week ${rp.weekNumber}) from ${req.requester.fullName || req.requester.email}`,
          amount: rp.amount,
          direction: 'in',
          status: 'Received',
        });
      }
    }
  }

  rows.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Transactions</h1>
        <p className="text-muted-foreground">
          Loan disbursements and repayments across your chama's loan account.
        </p>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" /> History
          </CardTitle>
          <CardDescription>Most recent first.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No transactions yet — they'll show up here once a loan is disbursed or repaid.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.date.toLocaleDateString()}</TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell>
                      <Badge variant={row.direction === 'in' ? 'default' : 'secondary'}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        row.direction === 'in' ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {row.direction === 'in' ? '+' : '-'}
                      {formatKES(row.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
