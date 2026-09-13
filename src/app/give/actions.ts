'use server';

import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { chargeMpesa, initializeCardTransaction, toPaystackPhone } from '@/lib/paystack';

/* ────────────────────────────────────────────────────────────── */
/*  Public giving — the whole point of a campaign's share link is   */
/*  that a supporter can open it from WhatsApp/SMS and pay without   */
/*  creating an L Chama account. This file has no auth requirement  */
/*  (unlike src/app/(dashboard)/campaigns/actions.ts) — if the      */
/*  caller does happen to be signed in, the donation is linked to   */
/*  their account too so it shows up in their own history; either   */
/*  way it's recorded against the campaign the same way.            */
/* ────────────────────────────────────────────────────────────── */

const DonateSchema = z.object({
  campaignId: z.string().min(1),
  amount: z.coerce.number().positive('Enter a valid amount.'),
  method: z.enum(['mpesa', 'card']),
  phone: z.string().optional(),
  guestName: z.string().optional(),
  message: z.string().max(280).optional(),
  anonymous: z.boolean().optional(),
});

export type DonateInput = z.infer<typeof DonateSchema>;

export async function donateToCampaign(input: DonateInput) {
  const parsed = DonateSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || 'Invalid donation details.');
  const d = parsed.data;

  const campaign = await prisma.campaign.findUnique({ where: { id: d.campaignId } });
  if (!campaign) throw new Error('Campaign not found.');
  if (campaign.status !== 'ACTIVE') throw new Error('This campaign is no longer accepting donations.');

  // Best-effort: link the donation to an L Chama account if the giver
  // happens to be signed in. Never required.
  let donorId: string | null = null;
  try {
    const { userId: clerkId } = await auth();
    if (clerkId) {
      const user = await prisma.user.findUnique({ where: { clerkId } });
      if (user) donorId = user.id;
    }
  } catch {
    // Not inside an authenticated context — proceed as a guest.
  }

  if (!donorId && !d.guestName?.trim()) throw new Error('Enter your name to give (or sign in first).');

  const rawPhone = d.phone?.trim();
  if (d.method === 'mpesa') {
    if (!rawPhone || (!/^(?:\+?254|0)7\d{8}$/.test(rawPhone) && !/^(?:\+?254|0)1\d{8}$/.test(rawPhone))) {
      throw new Error('Enter a valid Safaricom number, e.g. 07XX XXX XXX.');
    }
  }

  const donation = await prisma.donation.create({
    data: {
      campaignId: d.campaignId,
      donorId: donorId ?? undefined,
      guestName: donorId ? undefined : d.guestName?.trim(),
      guestPhone: donorId ? undefined : rawPhone,
      amount: d.amount,
      message: d.message?.trim() || undefined,
      anonymous: !!d.anonymous,
      channel: d.method === 'mpesa' ? 'MPESA' : 'VISA_CARD',
      status: 'PENDING',
    },
  });
  await prisma.donation.update({ where: { id: donation.id }, data: { reference: donation.id } });

  // Paystack requires an email; guests giving from a share link never have one on file.
  const donorEmail = `${donation.id}@lchama-donors.ludevaplc.co.ke`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9003';

  try {
    if (d.method === 'mpesa') {
      const charge = await chargeMpesa({
        email: donorEmail,
        amountKes: d.amount,
        phone: toPaystackPhone(rawPhone!),
        reference: donation.id,
        metadata: { donationId: donation.id, campaignId: d.campaignId },
      });
      if (charge.status === 'failed') {
        throw new Error(charge.display_text || 'The M-Pesa charge could not be started. Please try again.');
      }
      revalidatePath(`/give/${d.campaignId}`);
      return {
        success: true as const,
        mode: 'stk' as const,
        message: `Check your phone (${rawPhone}) for an M-Pesa prompt and enter your PIN to complete the KES ${d.amount.toLocaleString()} donation.`,
      };
    }

    const init = await initializeCardTransaction({
      email: donorEmail,
      amountKes: d.amount,
      reference: donation.id,
      callbackUrl: `${appUrl}/api/give/callback`,
      metadata: { donationId: donation.id, campaignId: d.campaignId },
    });
    return { success: true as const, mode: 'redirect' as const, authorizationUrl: init.authorization_url };
  } catch (err: any) {
    await prisma.donation
      .update({ where: { id: donation.id }, data: { status: 'FAILED' } })
      .catch(() => {});
    throw new Error(err.message || 'Could not start the donation. Please try again.');
  }
}
