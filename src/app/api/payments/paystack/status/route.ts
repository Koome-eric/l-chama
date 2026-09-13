import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// Polled by the M-Pesa tab of PaymentDialog after an STK push is sent.
// There's no redirect for mobile money the way there is for card, so
// the client checks in every few seconds until the webhook has flipped
// the Payment off PENDING.
export async function GET(req: NextRequest) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const paymentId = req.nextUrl.searchParams.get('paymentId');
  if (!paymentId) return NextResponse.json({ error: 'paymentId required' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ status: payment.status });
}
