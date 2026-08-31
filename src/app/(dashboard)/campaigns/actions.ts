'use server';

import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { CAMPAIGN_CATEGORIES } from '@/lib/campaigns';

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

// Donations are recorded manually (no live payment gateway wired up yet
// — same placeholder pattern as the chama loan account's manual
// funding). Each donation increments the campaign's raised total and
// backer count atomically.
export async function donateToCampaign(input: {
  campaignId: string;
  amount: number;
  message?: string;
  anonymous?: boolean;
}) {
  const user = await getCurrentDbUser();

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Enter a valid donation amount.');
  }

  const campaign = await prisma.campaign.findUnique({ where: { id: input.campaignId } });
  if (!campaign) throw new Error('Campaign not found.');
  if (campaign.status !== 'ACTIVE') throw new Error('This campaign is no longer accepting donations.');

  await prisma.$transaction([
    prisma.donation.create({
      data: {
        campaignId: input.campaignId,
        donorId: user.id,
        amount: input.amount,
        message: input.message?.trim() || undefined,
        anonymous: !!input.anonymous,
      },
    }),
    prisma.campaign.update({
      where: { id: input.campaignId },
      data: {
        raisedAmount: { increment: input.amount },
        backersCount: { increment: 1 },
      },
    }),
  ]);

  revalidatePath('/campaigns');
  revalidatePath(`/campaigns/${input.campaignId}`);
  return { success: true };
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
