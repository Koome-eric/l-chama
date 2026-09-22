'use server';

import { z } from 'zod';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { CHAMA_LEVELS } from '@/lib/chama-levels';
import { describeAuthError } from '@/lib/auth-error-messages';

const OnboardingSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name.'),
  phone: z.string().min(10, 'Enter a valid phone number.'),
  chamaName: z.string().min(2, 'Chama name must be at least 2 characters.'),
  levelKey: z.enum(
    CHAMA_LEVELS.map((l) => l.key) as [string, ...string[]],
    { errorMap: () => ({ message: 'Choose a chama level.' }) }
  ),
});

export type OnboardingInput = z.infer<typeof OnboardingSchema>;

export async function completeOnboarding(input: OnboardingInput) {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error(describeAuthError('You must be signed in.', 'sign-in'));

  const parsed = OnboardingSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(describeAuthError(parsed.error.errors[0]?.message || 'Invalid data provided.', 'onboarding'));
  }
  const d = parsed.data;

  const level = CHAMA_LEVELS.find((l) => l.key === d.levelKey);
  if (!level) throw new Error(describeAuthError('Choose a valid chama level.', 'onboarding'));

  const email =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error(describeAuthError('Your account has no email on file.', 'onboarding'));

  let user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        email,
        fullName: d.fullName.trim(),
        phone: d.phone.trim(),
        onboardingCompleted: true,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: d.fullName.trim(),
        phone: d.phone.trim(),
        onboardingCompleted: true,
      },
    });
  }

  const [ownsTeam, isTeamMember] = await Promise.all([
    prisma.team.findUnique({ where: { ownerId: user.id } }),
    prisma.teamMembership.findUnique({ where: { userId: user.id } }),
  ]);

  if (isTeamMember) {
    throw new Error(describeAuthError('You are already a member of a chama.', 'onboarding'));
  }

  if (!ownsTeam) {
    await prisma.team.create({
      data: {
        name: d.chamaName.trim(),
        ownerId: user.id,
        levelKey: level.key,
        levelName: level.name,
        monthlyAmount: level.monthlyAmount,
        groupSize: level.groupSize,
      },
    });
  }

  revalidatePath('/');
  revalidatePath('/onboarding');

  return { success: true };
}
