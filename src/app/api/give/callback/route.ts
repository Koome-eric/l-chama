import { NextRequest, NextResponse } from 'next/server';
import { verifyTransaction } from '@/lib/paystack';
import { creditDonation, failDonation } from '@/lib/donation-resolution';
import { prisma } from '@/lib/prisma';

/* ────────────────────────────────────────────────────────────── */
/*  Where Paystack's hosted card checkout sends a guest donor back  */
/*  to after paying (or abandoning) a campaign donation — passed as */
/*  `callback_url` when initiating a card donation from /give/[id]. */
/*                                                                   */
/*  Mirrors /api/payments/paystack/callback but for Donation rows,  */
/*  and redirects back to the public /give/[id] page instead of the */
/*  signed-in-only /accounts page.                                  */
/* ────────────────────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get('reference') || req.nextUrl.searchParams.get('trxref');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  if (!reference) {
    return NextResponse.redirect(`${appUrl}/give?donation=error`);
  }

  const donation = await prisma.donation.findUnique({ where: { reference }, select: { campaignId: true } });
  const backTo = donation ? `${appUrl}/give/${donation.campaignId}` : `${appUrl}/give`;

  try {
    const verified = await verifyTransaction(reference);
    if (verified.status === 'success') {
      await creditDonation(reference, { gatewayResponse: verified.gateway_response });
      return NextResponse.redirect(`${backTo}?donation=success`);
    }

    await failDonation(reference, verified.gateway_response);
    return NextResponse.redirect(`${backTo}?donation=failed`);
  } catch (err) {
    console.error('Paystack donation callback verification error:', err);
    return NextResponse.redirect(`${backTo}?donation=error`);
  }
}
