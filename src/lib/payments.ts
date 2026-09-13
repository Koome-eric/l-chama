import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/lib/notifications';
import { revalidatePath } from 'next/cache';

/**
 * Resolves a Payment by its Paystack `reference` — the one place both
 * the webhook (/api/payments/paystack/webhook) and the card-checkout
 * callback (/api/payments/paystack/callback) land, so a payment only
 * ever gets credited once no matter which fires first: the second call
 * finds the Payment already off PENDING and is a no-op. Mirrors the
 * crediting logic in admin/actions.ts's manual `resolvePayment` — same
 * outcome, just triggered by Paystack instead of an admin click.
 */
export async function finalizePaymentByReference(
  reference: string,
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED',
  note?: string
) {
  const payment = await prisma.payment.findUnique({
    where: { reference },
    include: { memberAccount: { include: { product: true } } },
  });
  if (!payment) return null;
  if (payment.status !== 'PENDING') return payment; // already resolved — idempotent

  if (status === 'SUCCESS') {
    if (!payment.memberAccountId || !payment.memberAccount) {
      return prisma.payment.update({ where: { id: payment.id }, data: { status, note } });
    }

    const [, updated] = await prisma.$transaction([
      prisma.memberAccount.update({
        where: { id: payment.memberAccountId },
        data: { balance: { increment: payment.amount } },
      }),
      prisma.payment.update({ where: { id: payment.id }, data: { status, note } }),
    ]);
    await notifyUser(
      payment.userId,
      'Payment confirmed',
      `Your KES ${payment.amount.toLocaleString()} payment to ${payment.memberAccount.product.name} was confirmed and credited.`
    );
    revalidatePath('/accounts');
    revalidatePath('/admin');
    return updated;
  }

  const updated = await prisma.payment.update({ where: { id: payment.id }, data: { status, note } });
  const paymentTarget = payment.memberAccount?.product.name ?? 'your account';
  await notifyUser(
    payment.userId,
    'Payment not completed',
    `Your KES ${payment.amount.toLocaleString()} payment to ${paymentTarget} could not be confirmed.${note ? ` ${note}` : ''}`
  );
  revalidatePath('/accounts');
  revalidatePath('/admin');
  return updated;
}
