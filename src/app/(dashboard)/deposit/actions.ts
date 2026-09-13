'use server';

import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getChamaContext } from '@/lib/chama';
import { chargeMpesa, initializeCardTransaction, toPaystackPhone } from '@/lib/paystack';

/* ────────────────────────────────────────────────────────────── */
/*  Deposit into a chama's shared LoanAccount — the real-money       */
/*  counterpart to the Team Leader's manual "Contribute" adjustment  */
/*  in the Panel. Any member can top up the pool this way (adding    */
/*  money to a shared account carries none of the risk that gating   */
/*  a withdrawal or a permission change does).                       */
/*                                                                    */
/*  Mirrors src/app/(dashboard)/accounts/actions.ts exactly, but the  */
/*  created Payment row points at teamId instead of memberAccountId  */
/*  — see src/lib/payment-resolution.ts for how each is credited.    */
/* ────────────────────────────────────────────────────────────── */

async function getCurrentDbUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error('You must be signed in.');
  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) throw new Error('Complete onboarding first.');
  return user;
}

/** Paystack requires an email; not every member has one on file. */
function paystackEmailFor(user: { id: string; email: string | null }) {
  return user.email ?? `${user.id}@lchama-users.ludevaplc.co.ke`;
}

export async function initiateDepositMpesaPayment(input: { amount: number; phone: string }) {
  const user = await getCurrentDbUser();
  const ctx = await getChamaContext(user);
  if (!ctx) throw new Error('You are not part of a chama.');

  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('Enter a valid amount.');
  const rawPhone = input.phone.trim();
  if (!/^(?:\+?254|0)7\d{8}$/.test(rawPhone) && !/^(?:\+?254|0)1\d{8}$/.test(rawPhone)) {
    throw new Error('Enter a valid Safaricom number, e.g. 07XX XXX XXX.');
  }

  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      teamId: ctx.team.id,
      channel: 'MPESA',
      amount: input.amount,
      phone: rawPhone,
      status: 'PENDING',
    },
  });
  await prisma.payment.update({ where: { id: payment.id }, data: { reference: payment.id } });

  try {
    const charge = await chargeMpesa({
      email: paystackEmailFor(user),
      amountKes: input.amount,
      phone: toPaystackPhone(rawPhone),
      reference: payment.id,
      metadata: { paymentId: payment.id, teamId: ctx.team.id, userId: user.id, purpose: 'loan-account-deposit' },
    });

    if (charge.status === 'failed') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', note: charge.display_text ?? 'Paystack declined the charge.' },
      });
      throw new Error(charge.display_text || 'The M-Pesa charge could not be started. Please try again.');
    }
  } catch (err: any) {
    await prisma.payment
      .update({ where: { id: payment.id }, data: { status: 'FAILED', note: String(err.message ?? '').slice(0, 200) } })
      .catch(() => {});
    throw new Error(err.message || 'Could not start the M-Pesa payment. Please try again.');
  }

  revalidatePath('/deposit');
  revalidatePath('/panel');
  return {
    success: true,
    paymentId: payment.id,
    message: `Check your phone (${rawPhone}) for an M-Pesa prompt and enter your PIN to complete the KES ${input.amount.toLocaleString()} deposit.`,
  };
}

export async function initiateDepositCardPayment(input: { amount: number }) {
  const user = await getCurrentDbUser();
  const ctx = await getChamaContext(user);
  if (!ctx) throw new Error('You are not part of a chama.');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('Enter a valid amount.');

  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      teamId: ctx.team.id,
      channel: 'VISA_CARD',
      amount: input.amount,
      status: 'PENDING',
    },
  });
  await prisma.payment.update({ where: { id: payment.id }, data: { reference: payment.id } });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9003';

  let authorizationUrl: string;
  try {
    const init = await initializeCardTransaction({
      email: paystackEmailFor(user),
      amountKes: input.amount,
      reference: payment.id,
      callbackUrl: `${appUrl}/api/payments/paystack/callback`,
      metadata: { paymentId: payment.id, teamId: ctx.team.id, userId: user.id, purpose: 'loan-account-deposit' },
    });
    authorizationUrl = init.authorization_url;
  } catch (err: any) {
    await prisma.payment
      .update({ where: { id: payment.id }, data: { status: 'FAILED', note: String(err.message ?? '').slice(0, 200) } })
      .catch(() => {});
    throw new Error(err.message || 'Could not start the card payment. Please try again.');
  }

  revalidatePath('/deposit');
  return {
    success: true,
    paymentId: payment.id,
    authorizationUrl,
    message: 'Redirecting you to a secure checkout…',
  };
}

export async function getRecentDeposits() {
  const user = await getCurrentDbUser();
  const ctx = await getChamaContext(user);
  if (!ctx) throw new Error('You are not part of a chama.');

  return prisma.payment.findMany({
    where: { teamId: ctx.team.id },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}
