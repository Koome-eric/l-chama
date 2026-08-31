'use server';

import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { CHAMA_LEVELS } from '@/lib/chama-levels';

const OrganisationSchema = z.object({
  organisationName: z.string().min(2, 'Enter an organisation or your full name.'),
  registrationNumber: z.string().min(2, 'Enter a business registration number or national ID.'),
  numberOfMembers: z.coerce.number().int().min(1, 'Enter the number of members.'),
  totalDirectors: z.coerce.number().int().min(1, 'Enter the number of directors.'),
  physicalAddress: z.string().min(3, 'Enter a physical address.'),
  additionalComments: z.string().optional(),
  levelKey: z.enum(
    CHAMA_LEVELS.map((l) => l.key) as [string, ...string[]],
    { errorMap: () => ({ message: 'Choose a chama level.' }) }
  ),
});

export type OrganisationInput = z.infer<typeof OrganisationSchema>;

// Registers the organisation and submits it for admin approval. Unlike
// the original single-step onboarding, the chama does NOT go live
// immediately — it sits at PENDING_APPROVAL until an admin reviews it
// (see /admin). Members can't be invited and the loan account isn't
// usable until approvalStatus flips to APPROVED (enforced in
// panel/actions.ts).
export async function registerOrganisation(input: OrganisationInput) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('You must be signed in.');

  const parsed = OrganisationSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || 'Invalid data provided.');
  }
  const d = parsed.data;

  const level = CHAMA_LEVELS.find((l) => l.key === d.levelKey);
  if (!level) throw new Error('Choose a valid chama level.');

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error('Complete your profile first.');
  if (!user.profileCompleted) throw new Error('Complete your profile first.');

  const [ownsTeam, isTeamMember] = await Promise.all([
    prisma.team.findUnique({ where: { ownerId: user.id } }),
    prisma.teamMembership.findUnique({ where: { userId: user.id } }),
  ]);

  if (isTeamMember) throw new Error('You are already a member of a chama.');

  if (!ownsTeam) {
    await prisma.team.create({
      data: {
        name: d.organisationName.trim(),
        ownerId: user.id,
        levelKey: level.key,
        levelName: level.name,
        monthlyAmount: level.monthlyAmount,
        groupSize: level.groupSize,
        businessRegNumber: d.registrationNumber.trim(),
        numberOfMembers: d.numberOfMembers,
        totalDirectors: d.totalDirectors,
        physicalAddress: d.physicalAddress.trim(),
        additionalComments: d.additionalComments?.trim() || undefined,
        approvalStatus: 'PENDING_APPROVAL',
      },
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingCompleted: true },
  });

  revalidatePath('/onboarding/organisation');
  revalidatePath('/onboarding/pending');
  return { success: true };
}
