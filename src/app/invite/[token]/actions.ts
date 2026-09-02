'use server';

import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { notifyUser } from '@/lib/notifications';
import { syncChamaToLudeva } from '@/lib/ludeva-sync';

export async function acceptChamaInvite(token: string) {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error('You must be signed in to accept this invite.');

  const invite = await prisma.teamInvite.findUnique({
    where: { token },
    include: { team: true },
  });
  if (!invite) throw new Error('This invite link is invalid.');

  if (invite.status === 'ACCEPTED') throw new Error('This invite has already been accepted.');
  if (invite.status === 'REVOKED') throw new Error('This invite has been revoked by the Team Leader.');
  if (invite.status === 'EXPIRED' || invite.expiresAt < new Date()) {
    if (invite.status !== 'EXPIRED') {
      await prisma.teamInvite.update({ where: { id: invite.id }, data: { status: 'EXPIRED' } });
    }
    throw new Error('This invite has expired. Ask the Team Leader to send a new one.');
  }

  const clerkEmail =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
    clerkUser.emailAddresses[0]?.emailAddress;

  if (!clerkEmail || clerkEmail.toLowerCase() !== invite.email.toLowerCase()) {
    throw new Error(
      `This invite was sent to ${invite.email}. Please sign in with that email address to accept it.`
    );
  }

  let user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        email: clerkEmail,
        fullName: `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() || undefined,
        onboardingCompleted: true,
      },
    });
  } else {
    const alreadyOwnsOrBelongs = await prisma.teamMembership.findUnique({ where: { userId: user.id } });
    if (alreadyOwnsOrBelongs) throw new Error('You are already part of a chama.');
    const ownsAnother = await prisma.team.findUnique({ where: { ownerId: user.id } });
    if (ownsAnother) throw new Error('You already own your own chama.');

    user = await prisma.user.update({
      where: { id: user.id },
      data: { onboardingCompleted: true },
    });
  }

  await prisma.teamMembership.create({
    data: {
      teamId: invite.teamId,
      userId: user.id,
      canInvite: invite.canInvite,
      canManagePermissions: invite.canManagePermissions,
      canRemoveMembers: invite.canRemoveMembers,
      canApproveLoans: invite.canApproveLoans,
      canInvestPooled: invite.canInvestPooled,
      canViewPooledFunds: invite.canViewPooledFunds,
      canManageReports: invite.canManageReports,
      canWithdraw: invite.canWithdraw,
    },
  });

  await prisma.teamInvite.update({ where: { id: invite.id }, data: { status: 'ACCEPTED' } });

  const client = await clerkClient();
  const existingMetadata = clerkUser.publicMetadata || {};
  await client.users.updateUser(clerkUser.id, {
    publicMetadata: { ...existingMetadata, dbId: user.id },
  });

  await notifyUser(
    invite.invitedById,
    'Invite accepted',
    `${user.fullName || user.email} has joined ${invite.team.name}.`
  );

  await syncChamaToLudeva(invite.teamId);

  revalidatePath('/panel');
  return { success: true };
}
