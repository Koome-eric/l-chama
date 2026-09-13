import { requirePanelAccess } from '@/lib/require-panel-access';
import { prisma } from '@/lib/prisma';
import { getRecentDeposits } from './actions';
import { DepositClient } from './DepositClient';

export default async function DepositPage() {
  const { ctx } = await requirePanelAccess('/deposit');

  const [loanAccount, deposits] = await Promise.all([
    prisma.loanAccount.findUnique({ where: { teamId: ctx.team.id } }),
    getRecentDeposits(),
  ]);

  return (
    <DepositClient
      teamName={ctx.team.name}
      availableBalance={loanAccount?.balance ?? 0}
      deposits={deposits.map((d) => ({
        id: d.id,
        amount: d.amount,
        channel: d.channel,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
        memberName: d.user.fullName || d.user.email || d.user.phone || 'Member',
      }))}
    />
  );
}
