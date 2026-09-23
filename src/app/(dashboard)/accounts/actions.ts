'use server';

import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { notifyUser } from '@/lib/notifications';
import { chargeMpesa, initializeCardTransaction, toPaystackPhone } from '@/lib/paystack';
import { friendlyPaymentError } from '@/lib/errors';

async function getCurrentDbUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error('You must be signed in.');
  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) throw new Error('Complete onboarding first.');
  return user;
}

async function getOrCreateMemberAccount(userId: string, productId: string) {
  const product = await prisma.investmentProduct.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) throw new Error('This account type is not available right now.');

  const existing = await prisma.memberAccount.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) return existing;

  return prisma.memberAccount.create({ data: { userId, productId } });
}

/* ────────────────────────────────────────────────────────────── */
/*                     M-PESA / VISA CARD PAYMENTS                 */
/*                                                                   */
/*  Both channels go through Paystack (see src/lib/paystack.ts):    */
/*   - MPESA: Paystack's Charge API triggers an STK push straight   */
/*     to the member's phone — no redirect.                         */
/*   - VISA_CARD: Paystack's hosted checkout — the member is        */
/*     redirected to `authorization_url` and back to                */
/*     /api/payments/paystack/callback when done.                   */
/*  Either way the Payment row is created PENDING and only ever     */
/*  moves to SUCCESS/FAILED via Paystack's webhook (or the callback */
/*  redirect as a faster fallback) — see payment-resolution.ts. An  */
/*  admin can still resolve a payment manually from /admin as a     */
/*  fallback if a webhook is ever missed.                           */
/* ────────────────────────────────────────────────────────────── */

/** Paystack requires an email; not every member has one on file. */
function paystackEmailFor(user: { id: string; email: string | null }) {
  return user.email ?? `${user.id}@lchama-users.ludevaplc.co.ke`;
}

export async function initiateMpesaPayment(input: { productId: string; amount: number; phone: string }) {
  const user = await getCurrentDbUser();

  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('Enter a valid amount.');
  const rawPhone = input.phone.trim();
  if (!/^(?:\+?254|0)7\d{8}$/.test(rawPhone) && !/^(?:\+?254|0)1\d{8}$/.test(rawPhone)) {
    throw new Error('Enter a valid Safaricom number, e.g. 07XX XXX XXX.');
  }

  const account = await getOrCreateMemberAccount(user.id, input.productId);

  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      memberAccountId: account.id,
      channel: 'MPESA',
      amount: input.amount,
      phone: rawPhone,
      status: 'PENDING',
    },
  });
  // Reference doubles as our own id so the webhook/callback can look the
  // Payment row back up without any extra bookkeeping.
  await prisma.payment.update({ where: { id: payment.id }, data: { reference: payment.id } });

  try {
    const charge = await chargeMpesa({
      email: paystackEmailFor(user),
      amountKes: input.amount,
      phone: toPaystackPhone(rawPhone),
      reference: payment.id,
      metadata: { paymentId: payment.id, productId: input.productId, userId: user.id },
    });

    if (charge.status === 'failed') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', note: charge.display_text ?? 'Paystack declined the charge.' },
      });
      throw new Error(charge.display_text || 'The M-Pesa charge could not be started. Please try again.');
    }
  } catch (err: any) {
    // Don't leave an orphaned PENDING row if Paystack rejected the request outright.
    await prisma.payment
      .update({ where: { id: payment.id }, data: { status: 'FAILED', note: String(err.message ?? '').slice(0, 200) } })
      .catch(() => {});
    throw friendlyPaymentError(err, 'M-Pesa payment');
  }

  revalidatePath('/accounts');
  return {
    success: true,
    paymentId: payment.id,
    message: `Check your phone (${rawPhone}) for an M-Pesa prompt and enter your PIN to complete the KES ${input.amount.toLocaleString()} payment.`,
  };
}

export async function initiateCardPayment(input: { productId: string; amount: number }) {
  const user = await getCurrentDbUser();
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('Enter a valid amount.');

  const account = await getOrCreateMemberAccount(user.id, input.productId);

  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      memberAccountId: account.id,
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
      metadata: { paymentId: payment.id, productId: input.productId, userId: user.id },
    });
    authorizationUrl = init.authorization_url;
  } catch (err: any) {
    await prisma.payment
      .update({ where: { id: payment.id }, data: { status: 'FAILED', note: String(err.message ?? '').slice(0, 200) } })
      .catch(() => {});
    throw friendlyPaymentError(err, 'card payment');
  }

  revalidatePath('/accounts');
  return {
    success: true,
    paymentId: payment.id,
    authorizationUrl,
    message: 'Redirecting you to a secure checkout…',
  };
}

/* ────────────────────────────────────────────────────────────── */
/*                    LUDEVA JUNIOR ACCOUNT APPLICATION            */
/*                                                                   */
/*  Files are uploaded client-side first via POST /api/upload-doc   */
/*  (Cloudflare R2 — same storage pipeline the main Ludeva app uses  */
/*  for its KYC documents), so this action only ever receives the   */
/*  resulting hosted URLs, not raw file data.                       */
/* ────────────────────────────────────────────────────────────── */

export async function submitJuniorApplication(input: {
  childFullName: string;
  childDateOfBirth?: string;
  guardianIdNumber: string;
  guardianPhone: string;
  guardianKraPin: string;
  birthCertUrl: string;
  childPhotoUrl: string;
}) {
  const user = await getCurrentDbUser();

  const childFullName = input.childFullName?.trim();
  const guardianIdNumber = input.guardianIdNumber?.trim();
  const guardianPhone = input.guardianPhone?.trim();
  const guardianKraPin = input.guardianKraPin?.trim();

  if (!childFullName) throw new Error("Enter the child's full name.");
  if (!guardianIdNumber) throw new Error('Enter your ID/passport number.');
  if (!guardianPhone) throw new Error('Enter your phone number.');
  if (!guardianKraPin) throw new Error('Enter your KRA PIN.');
  if (!input.birthCertUrl) throw new Error("Upload the child's birth certificate.");
  if (!input.childPhotoUrl) throw new Error("Upload the child's passport photo.");

  const application = await prisma.juniorAccountApplication.create({
    data: {
      guardianId: user.id,
      childFullName,
      childDateOfBirth: input.childDateOfBirth ? new Date(input.childDateOfBirth) : undefined,
      guardianIdNumber,
      guardianPhone,
      guardianKraPin,
      birthCertUrl: input.birthCertUrl,
      childPhotoUrl: input.childPhotoUrl,
    },
  });

  revalidatePath('/accounts');
  return { success: true, applicationId: application.id };
}
