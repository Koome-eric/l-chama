import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/lib/notifications';

/* ────────────────────────────────────────────────────────────── */
/*  Mirrors src/lib/payment-resolution.ts but for Donation rows.    */
/*  Split into its own file because donations can also come from    */
/*  guest donors with no User row to notify.                        */
/* ────────────────────────────────────────────────────────────── */

export async function creditDonation(reference: string, opts: { gatewayResponse?: string } = {}) {
  const donation = await prisma.donation.findUnique({
    where: { reference },
    include: { campaign: true },
  });
  if (!donation) return { credited: false as const, reason: 'not_found' as const };
  if (donation.status !== 'PENDING') return { credited: false as const, reason: 'already_resolved' as const };

  const claimed = await prisma.donation.updateMany({
    where: { id: donation.id, status: 'PENDING' },
    data: { status: 'SUCCESS' },
  });
  if (claimed.count === 0) return { credited: false as const, reason: 'already_resolved' as const };

  await prisma.campaign.update({
    where: { id: donation.campaignId },
    data: {
      raisedAmount: { increment: donation.amount },
      backersCount: { increment: 1 },
    },
  });

  await notifyUser(
    donation.campaign.creatorId,
    'New donation received',
    `${donation.anonymous ? 'Someone' : donation.guestName || 'A supporter'} gave KES ${donation.amount.toLocaleString()} to "${donation.campaign.title}".`
  );
  if (donation.donorId) {
    await notifyUser(
      donation.donorId,
      'Donation confirmed',
      `Your KES ${donation.amount.toLocaleString()} donation to "${donation.campaign.title}" was confirmed. Thank you!`
    );
  }

  return { credited: true as const, donation };
}

export async function failDonation(reference: string, reason?: string) {
  const donation = await prisma.donation.findUnique({ where: { reference } });
  if (!donation) return { updated: false as const, reason: 'not_found' as const };
  if (donation.status !== 'PENDING') return { updated: false as const, reason: 'already_resolved' as const };

  const claimed = await prisma.donation.updateMany({
    where: { id: donation.id, status: 'PENDING' },
    data: { status: 'FAILED' },
  });
  if (claimed.count === 0) return { updated: false as const, reason: 'already_resolved' as const };

  if (donation.donorId) {
    await notifyUser(
      donation.donorId,
      'Donation not completed',
      `Your KES ${donation.amount.toLocaleString()} donation could not be completed.${reason ? ` ${reason}` : ''}`
    );
  }

  return { updated: true as const };
}
