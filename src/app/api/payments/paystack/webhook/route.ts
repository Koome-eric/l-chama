import { NextRequest, NextResponse } from 'next/server';
import { isValidPaystackSignature, verifyTransaction } from '@/lib/paystack';
import { creditPaystackPayment, failPaystackPayment } from '@/lib/payment-resolution';
import { creditDonation, failDonation } from '@/lib/donation-resolution';

/* ────────────────────────────────────────────────────────────── */
/*  Paystack webhook — set this URL in Paystack Dashboard → Settings│
/*  → API Keys & Webhooks → Webhook URL:                            */
/*    {NEXT_PUBLIC_APP_URL}/api/payments/paystack/webhook           */
/*                                                                   */
/*  This is the source of truth for resolving a payment or donation.*/
/*  The reference is looked up against Payment first (personal      */
/*  account funding) and, if not found there, Donation (campaign    */
/*  giving) — the two use the same reference scheme (their own row  */
/*  id) so this never has to guess which table a reference is for.  */
/*  The card checkout callback route also tries to resolve for a    */
/*  faster UI response, but this webhook is what guarantees it      */
/*  eventually happens even if the payer closes the tab.            */
/* ────────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  if (!isValidPaystackSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const reference: string | undefined = event?.data?.reference;
  if (!reference) {
    return NextResponse.json({ received: true });
  }

  try {
    if (event.event === 'charge.success') {
      // Re-verify server-to-server rather than trusting the webhook
      // payload's amount/status directly — the standard, tamper-resistant
      // pattern Paystack recommends.
      const verified = await verifyTransaction(reference);
      if (verified.status === 'success') {
        const paymentResult = await creditPaystackPayment(reference, {
          gatewayResponse: verified.gateway_response,
          channel: verified.channel,
        });
        if (!paymentResult.credited && paymentResult.reason === 'not_found') {
          await creditDonation(reference, { gatewayResponse: verified.gateway_response });
        }
      } else {
        const paymentResult = await failPaystackPayment(reference, verified.gateway_response);
        if (!paymentResult.updated && paymentResult.reason === 'not_found') {
          await failDonation(reference, verified.gateway_response);
        }
      }
    } else if (event.event === 'charge.failed') {
      const paymentResult = await failPaystackPayment(reference, event?.data?.gateway_response);
      if (!paymentResult.updated && paymentResult.reason === 'not_found') {
        await failDonation(reference, event?.data?.gateway_response);
      }
    }
    // Other event types (transfer.*, subscription.*, etc.) aren't used by
    // this app and are safely ignored.
  } catch (err) {
    console.error('Paystack webhook handling error:', err);
    // Still respond 200: Paystack retries non-2xx responses, and retrying
    // won't fix an error that isn't transient (e.g. a bad reference).
  }

  return NextResponse.json({ received: true });
}
