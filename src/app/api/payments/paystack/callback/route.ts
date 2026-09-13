import { NextRequest, NextResponse } from 'next/server';
import { verifyTransaction } from '@/lib/paystack';
import { creditPaystackPayment, failPaystackPayment } from '@/lib/payment-resolution';
import { prisma } from '@/lib/prisma';

/* ────────────────────────────────────────────────────────────── */
/*  Where Paystack's hosted card checkout redirects the payer back  */
/*  to after they complete (or abandon) payment. Passed as          */
/*  `callback_url` when a card transaction is initialized in either  */
/*  src/app/(dashboard)/accounts/actions.ts (personal account) or    */
/*  src/app/(dashboard)/deposit/actions.ts (chama loan account).     */
/*                                                                   */
/*  This verifies the transaction and, if the webhook hasn't beaten */
/*  it to it, credits the right target right away — then sends the  */
/*  payer back to wherever they started (/accounts or /deposit)     */
/*  with a status flag the UI can toast on.                         */
/* ────────────────────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get('reference') || req.nextUrl.searchParams.get('trxref');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  if (!reference) {
    return NextResponse.redirect(`${appUrl}/accounts?payment=error`);
  }

  const payment = await prisma.payment.findUnique({ where: { reference }, select: { teamId: true } });
  const backTo = payment?.teamId ? `${appUrl}/deposit` : `${appUrl}/accounts`;

  try {
    const verified = await verifyTransaction(reference);
    if (verified.status === 'success') {
      await creditPaystackPayment(reference, {
        gatewayResponse: verified.gateway_response,
        channel: verified.channel,
      });
      return NextResponse.redirect(`${backTo}?payment=success`);
    }

    await failPaystackPayment(reference, verified.gateway_response);
    return NextResponse.redirect(`${backTo}?payment=failed`);
  } catch (err) {
    console.error('Paystack callback verification error:', err);
    return NextResponse.redirect(`${backTo}?payment=error`);
  }
}
