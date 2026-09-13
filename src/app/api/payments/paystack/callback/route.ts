import { NextRequest, NextResponse } from 'next/server';
import { verifyTransaction } from '@/lib/paystack';
import { creditPaystackPayment, failPaystackPayment } from '@/lib/payment-resolution';

/* ────────────────────────────────────────────────────────────── */
/*  Where Paystack's hosted card checkout redirects the payer back  */
/*  to after they complete (or abandon) payment. Passed as          */
/*  `callback_url` when the card transaction is initialized in      */
/*  src/app/(dashboard)/accounts/actions.ts.                        */
/*                                                                   */
/*  This verifies the transaction and, if the webhook hasn't beaten */
/*  it to it, credits the account right away — then sends the payer */
/*  back to /accounts with a status flag the UI can toast on.       */
/* ────────────────────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get('reference') || req.nextUrl.searchParams.get('trxref');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  if (!reference) {
    return NextResponse.redirect(`${appUrl}/accounts?payment=error`);
  }

  try {
    const verified = await verifyTransaction(reference);
    if (verified.status === 'success') {
      await creditPaystackPayment(reference, {
        gatewayResponse: verified.gateway_response,
        channel: verified.channel,
      });
      return NextResponse.redirect(`${appUrl}/accounts?payment=success`);
    }

    await failPaystackPayment(reference, verified.gateway_response);
    return NextResponse.redirect(`${appUrl}/accounts?payment=failed`);
  } catch (err) {
    console.error('Paystack callback verification error:', err);
    return NextResponse.redirect(`${appUrl}/accounts?payment=error`);
  }
}
