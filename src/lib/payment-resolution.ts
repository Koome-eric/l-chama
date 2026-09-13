import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/lib/notifications';
import { syncChamaToLudeva } from '@/lib/ludeva-sync';

/* ────────────────────────────────────────────────────────────── */
/*  Shared by both the Paystack webhook and the checkout callback   */
/*  redirect — both can race to resolve the same payment, so the    */
/*  actual status flip is done with a conditional updateMany() that */
/*  only succeeds once, and everything after it (crediting the      */
/*  right balance, notifying the user) only runs for the caller     */
/*  that won that race. A Payment credits either a personal          */
/*  MemberAccount (/accounts) or a chama's shared LoanAccount        */
/*  (/deposit) — whichever of memberAccountId/teamId is set.         */
/* ────────────────────────────────────────────────────────────── */

export async function creditPaystackPayment(
  reference: string,
  opts: { gatewayResponse?: string; channel?: string } = {}
) {
  const payment = await prisma.payment.findUnique({
    where: { reference },
    include: { memberAccount: { include: { product: true } }, team: true },
  });
  if (!payment) return { credited: false as const, reason: 'not_found' as const };
  if (payment.status !== 'PENDING') return { credited: false as const, reason: 'already_resolved' as const };

  const claimed = await prisma.payment.updateMany({
    where: { id: payment.id, status: 'PENDING' },
    data: {
      status: 'SUCCESS',
      note: opts.gatewayResponse ? `Paystack (${opts.channel ?? 'unknown channel'}): ${opts.gatewayResponse}` : undefined,
    },
  });
  if (claimed.count === 0) return { credited: false as const, reason: 'already_resolved' as const };

  if (payment.memberAccountId && payment.memberAccount) {
    await prisma.memberAccount.update({
      where: { id: payment.memberAccountId },
      data: { balance: { increment: payment.amount } },
    });
    await notifyUser(
      payment.userId,
      'Payment confirmed',
      `Your KES ${payment.amount.toLocaleString()} payment to ${payment.memberAccount.product.name} was confirmed and credited.`
    );
  } else if (payment.teamId) {
    await prisma.loanAccount.upsert({
      where: { teamId: payment.teamId },
      create: { teamId: payment.teamId, balance: Math.max(0, payment.amount) },
      update: { balance: { increment: payment.amount } },
    });
    await syncChamaToLudeva(payment.teamId);
    await notifyUser(
      payment.userId,
      'Deposit confirmed',
      `Your KES ${payment.amount.toLocaleString()} deposit to ${payment.team?.name ?? 'your chama'}'s loan account was confirmed and credited.`
    );
  }

  return { credited: true as const, payment };
}

export async function failPaystackPayment(reference: string, reason?: string) {
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) return { updated: false as const, reason: 'not_found' as const };
  if (payment.status !== 'PENDING') return { updated: false as const, reason: 'already_resolved' as const };

  const claimed = await prisma.payment.updateMany({
    where: { id: payment.id, status: 'PENDING' },
    data: { status: 'FAILED', note: reason ? `Paystack: ${reason}` : undefined },
  });
  if (claimed.count === 0) return { updated: false as const, reason: 'already_resolved' as const };

  await notifyUser(
    payment.userId,
    'Payment not completed',
    `Your KES ${payment.amount.toLocaleString()} payment could not be completed.${reason ? ` ${reason}` : ''}`
  );
  return { updated: true as const };
}
