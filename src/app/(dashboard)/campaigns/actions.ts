'use server';

import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { CAMPAIGN_CATEGORIES } from '@/lib/campaigns';
import { createWithdrawalRequest, decideWithdrawalRequest, getSignatoryStatus } from '@/lib/withdrawals';

const CreateCampaignSchema = z.object({
  title: z.string().min(4, 'Enter a campaign title.'),
  description: z.string().min(10, 'Enter a short description (at least 10 characters).').max(300),
  story: z.string().min(30, 'Tell the full story — at least 30 characters.'),
  category: z.enum(CAMPAIGN_CATEGORIES, { errorMap: () => ({ message: 'Choose a category.' }) }),
  location: z.string().min(2, 'Enter a location.'),
  targetAmount: z.coerce.number().positive('Enter a target amount.'),
  deadline: z.string().min(1, 'Choose a deadline.'),
  beneficiaries: z.coerce.number().int().min(0).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;

async function getCurrentDbUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('You must be signed in.');
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error('Complete onboarding first.');
  if (!user.profileCompleted) throw new Error('Complete your profile first.');
  return user;
}

export async function createCampaign(input: CreateCampaignInput) {
  const user = await getCurrentDbUser();

  const parsed = CreateCampaignSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || 'Invalid data provided.');
  }
  const d = parsed.data;

  const deadline = new Date(d.deadline);
  if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now()) {
    throw new Error('Choose a deadline in the future.');
  }

  const campaign = await prisma.campaign.create({
    data: {
      title: d.title.trim(),
      description: d.description.trim(),
      story: d.story.trim(),
      category: d.category,
      location: d.location.trim(),
      targetAmount: d.targetAmount,
      deadline,
      beneficiaries: d.beneficiaries,
      imageUrl: d.imageUrl?.trim() || undefined,
      creatorId: user.id,
    },
  });

  revalidatePath('/campaigns');
  return { success: true, campaignId: campaign.id };
}

export async function closeCampaign(campaignId: string) {
  const user = await getCurrentDbUser();
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error('Campaign not found.');
  if (campaign.creatorId !== user.id) throw new Error('Only the campaign creator can close it.');

  await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'CLOSED' } });
  revalidatePath('/campaigns');
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true };
}

/* ────────────────────────────────────────────────────────────── */
/*     2-SIGNATORY WITHDRAWAL — Admin (creator) + Secretary          */
/*                                                                   */
/*  Donations (the actual giving) are handled in                    */
/*  src/app/give/actions.ts — no sign-in required there, since       */
/*  anyone with the campaign's share link can give. Everything below*/
/*  is creator/signatory-only account management.                   */
/* ────────────────────────────────────────────────────────────── */

/** Look up a registered L Chama user by phone or email, to assign as a signatory. */
export async function findUserForSignatory(query: string) {
  const q = query.trim();
  if (!q) throw new Error('Enter a phone number or email.');
  const user = await prisma.user.findFirst({
    where: { OR: [{ phone: q }, { email: q.toLowerCase() }] },
    select: { id: true, fullName: true, phone: true, email: true },
  });
  if (!user) throw new Error('No L Chama member found with that phone/email — they need an account first.');
  return user;
}

export async function setCampaignSignatories(input: { campaignId: string; secretaryId?: string }) {
  const user = await getCurrentDbUser();
  const campaign = await prisma.campaign.findUnique({ where: { id: input.campaignId } });
  if (!campaign) throw new Error('Campaign not found.');
  if (campaign.creatorId !== user.id) throw new Error('Only the campaign creator (Admin) can assign signatories.');

  if (input.secretaryId === user.id) {
    throw new Error('The creator is already the Admin signatory — pick someone else for Secretary.');
  }

  await prisma.campaign.update({
    where: { id: input.campaignId },
    data: {
      secretaryId: input.secretaryId ?? undefined,
    },
  });

  revalidatePath(`/campaigns/${input.campaignId}`);
  return { success: true };
}

export async function requestCampaignWithdrawal(input: {
  campaignId: string;
  amount: number;
  destinationPhone: string;
  reason?: string;
}) {
  const user = await getCurrentDbUser();
  await createWithdrawalRequest({
    scope: 'CAMPAIGN',
    scopeId: input.campaignId,
    requestedById: user.id,
    amount: input.amount,
    destinationPhone: input.destinationPhone,
    reason: input.reason,
  });
  revalidatePath(`/campaigns/${input.campaignId}`);
  return { success: true };
}

export async function decideCampaignWithdrawal(input: {
  withdrawalRequestId: string;
  campaignId: string;
  decision: 'APPROVED' | 'REJECTED';
  comment?: string;
}) {
  const user = await getCurrentDbUser();
  const result = await decideWithdrawalRequest({
    withdrawalRequestId: input.withdrawalRequestId,
    userId: user.id,
    decision: input.decision,
    comment: input.comment,
  });
  revalidatePath(`/campaigns/${input.campaignId}`);
  return result;
}

export async function getCampaignSignatoryStatus(campaignId: string) {
  const user = await getCurrentDbUser();
  return getSignatoryStatus('CAMPAIGN', campaignId, user.id);
}

export async function getCampaignWithdrawState(campaignId: string) {
  const user = await getCurrentDbUser();
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { creator: true, secretary: true },
  });
  if (!campaign) throw new Error('Campaign not found.');

  const [status, requests] = await Promise.all([
    getSignatoryStatus('CAMPAIGN', campaignId, user.id),
    prisma.withdrawalRequest.findMany({
      where: { campaignId },
      include: { approvals: { include: { approver: true } }, requestedBy: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return {
    campaignId,
    myUserId: user.id,
    isCreator: campaign.creatorId === user.id,
    admin: { userId: campaign.creatorId, name: campaign.creator.fullName || campaign.creator.email || 'Creator' },
    secretary: campaign.secretary
      ? { userId: campaign.secretaryId!, name: campaign.secretary.fullName || campaign.secretary.email || 'Secretary' }
      : null,
    ...status,
    requests,
  };
}

export async function updateCampaignImage(campaignId: string, imageUrl: string) {
  const user = await getCurrentDbUser();
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error('Campaign not found.');
  if (campaign.creatorId !== user.id) throw new Error('Only the campaign creator can change the cover image.');

  await prisma.campaign.update({ where: { id: campaignId }, data: { imageUrl: imageUrl || null } });

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath('/campaigns');
  return { success: true };
}
