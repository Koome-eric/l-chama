'use server';

import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { CHAMA_LEVELS } from '@/lib/chama-levels';
import { friendlyAccountError } from '@/lib/errors';
import { toResult } from '@/lib/action-result';
import { setActiveChamaCookie } from '@/lib/chama';

const OBJECTIVE_KEYS = ['BUY_ASSETS', 'GET_A_LOAN', 'GET_INTEREST', 'SCHOOL_FEES', 'DECEMBER_HOLIDAY'] as const;

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
  isDiaspora: z.boolean().default(false),
  objectives: z.array(z.enum(OBJECTIVE_KEYS)).min(1, "Select at least one of your chama's objectives."),
  membersRunningSME: z.coerce.number().int().min(0, 'Enter a number of members (0 or more).'),
  membersEmployed: z.coerce.number().int().min(0, 'Enter a number of members (0 or more).'),
  hasLastRespectCover: z.boolean().default(false),
  lastRespectContribution: z.coerce.number().min(0).optional(),
  privacyPolicyAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Please tick "I Agree" to the Privacy Policy to continue.' }),
  }),
});

export type OrganisationInput = z.infer<typeof OrganisationSchema>;

// Registers the organisation and submits it for admin approval. Unlike
// the original single-step onboarding, the chama does NOT go live
// immediately — it sits at PENDING_APPROVAL until an admin reviews it
// (see /admin). Members can't be invited and the loan account isn't
// usable until approvalStatus flips to APPROVED (enforced in
// panel/actions.ts).
export async function registerOrganisation(input: OrganisationInput) {
  // Returned as { ok, error } rather than thrown: Next.js hides the message of
  // a thrown server-action error in production, and the reasons here ("that
  // Ludeva Number is already registered", ...) are ones the person must see.
  return toResult(() => registerOrganisationImpl(input));
}

async function registerOrganisationImpl(input: OrganisationInput) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('You must be signed in.');

  const parsed = OrganisationSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || 'Invalid data provided.');
  }
  const d = parsed.data;

  if (d.hasLastRespectCover && (!d.lastRespectContribution || d.lastRespectContribution <= 0)) {
    throw new Error('Set a per-member contribution amount for Last Respect Cover.');
  }

  const level = CHAMA_LEVELS.find((l) => l.key === d.levelKey);
  if (!level) throw new Error('Choose a valid chama level.');

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error('Complete your profile first.');
  if (!user.profileCompleted) throw new Error('Complete your profile first.');

  const name = d.organisationName.trim();

  // One account can own several chamas, so a second registration is fine —
  // but resubmitting the same form (double-click, refresh) must not create
  // the same chama twice.
  const owned = await prisma.team.findMany({ where: { ownerId: user.id } });
  if (owned.some((t) => t.name.trim().toLowerCase() === name.toLowerCase() && t.businessRegNumber)) {
    throw new Error(`You've already registered a chama called "${name}". Use a different name for another chama.`);
  }

  try {
    const data = {
      name,
      levelKey: level.key,
      levelName: level.name,
      monthlyAmount: level.monthlyAmount,
      groupSize: level.groupSize,
      businessRegNumber: d.registrationNumber.trim(),
      numberOfMembers: d.numberOfMembers,
      totalDirectors: d.totalDirectors,
      physicalAddress: d.physicalAddress.trim(),
      additionalComments: d.additionalComments?.trim() || undefined,
      approvalStatus: 'PENDING_APPROVAL' as const,
      privacyPolicyAccepted: true,
      termsAcceptedAt: new Date(),
      isDiaspora: d.isDiaspora,
      objectives: d.objectives,
      membersRunningSME: d.membersRunningSME,
      membersEmployed: d.membersEmployed,
      hasLastRespectCover: d.hasLastRespectCover,
      lastRespectContribution: d.hasLastRespectCover ? d.lastRespectContribution : null,
    };

    // A bare chama created by the older one-step signup has no registration
    // details yet — complete that one rather than adding a second.
    const stub = owned.find((t) => !t.businessRegNumber);
    const team = stub
      ? await prisma.team.update({ where: { id: stub.id }, data })
      : await prisma.team.create({ data: { ...data, ownerId: user.id } });

    if (d.hasLastRespectCover) {
      await prisma.lastRespectFund.upsert({
        where: { teamId: team.id },
        update: {},
        create: { teamId: team.id, balance: 0 },
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { onboardingCompleted: true, privacyPolicyAcceptedAt: new Date() },
    });

    // Show the chama just registered (its pending-approval page) next.
    await setActiveChamaCookie(team.id);
  } catch (err) {
    throw friendlyAccountError(err, { businessRegNumber: 'registration number' });
  }

  revalidatePath('/onboarding/organisation');
  revalidatePath('/onboarding/pending');
  return { success: true };
}
