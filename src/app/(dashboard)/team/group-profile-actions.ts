'use server';

import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getChamaContext } from '@/lib/chama';
import { toResult } from '@/lib/action-result';
import { groupProfileSchema, groupProfileData } from '@/lib/group-profile';

// Team Leader updates the group's market profile (group KYC) after
// registration. Owner only: it describes the chama itself.
export async function saveGroupProfile(input: unknown) {
  return toResult(async () => {
    const clerkUser = await currentUser();
    if (!clerkUser) throw new Error('You must be signed in.');
    const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
    if (!user) throw new Error('Account not found.');

    const ctx = await getChamaContext(user);
    if (!ctx) throw new Error('You are not part of a chama.');
    if (!ctx.isOwner) throw new Error('Only the Team Leader can update the group profile.');

    const parsed = groupProfileSchema.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Check the group profile and try again.');

    await prisma.team.update({ where: { id: ctx.team.id }, data: groupProfileData(parsed.data) });

    revalidatePath('/team');
    revalidatePath('/panel');
    revalidatePath('/admin');
    return {};
  });
}
