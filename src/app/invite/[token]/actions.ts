'use server';

import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { notifyUser } from '@/lib/notifications';
import { syncChamaToLudeva } from '@/lib/ludeva-sync';
import { setActiveChamaCookie } from '@/lib/chama';
import { friendlyAccountError } from '@/lib/errors';
import { toResult } from '@/lib/action-result';

export async function acceptChamaInvite(
  token: string,
  profile: { idNumber: string; phone: string; privacyPolicyAccepted: boolean; county?: string; residentSubCounty?: string }
) {
  return toResult(() => acceptChamaInviteImpl(token, profile));
}

async function acceptChamaInviteImpl(
  token: string,
  profile: { idNumber: string; phone: string; privacyPolicyAccepted: boolean; county?: string; residentSubCounty?: string }
) {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error('You must be signed in to accept this invite.');

  const idNumber = profile.idNumber.trim();
  const phone = profile.phone.trim();
  if (profile.privacyPolicyAccepted !== true) {
    throw new Error('Please tick "I Agree" to the Privacy Policy to join the chama.');
  }
  // Blank is allowed when the account already has an ID on file (it is never
  // sent back to the browser); that is re-checked below once the user is loaded.
  if (idNumber && idNumber.length < 4) throw new Error('Enter a valid ID/passport number.');
  if (phone.length < 7) throw new Error('Enter a valid phone number.');
  const county = profile.county?.trim() || '';
  const residentSubCounty = profile.residentSubCounty?.trim() || '';

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

  let user;
  try {
    user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });

    if (!user) {
      if (idNumber.length < 4) throw new Error('Enter a valid ID/passport number.');
      if (!county || !residentSubCounty) throw new Error('Select your resident county and enter your sub-county.');
      user = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email: clerkEmail,
          phone,
          idNumber,
          region: county,
          residentSubCounty: residentSubCounty || undefined,
          fullName: `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() || undefined,
          profileCompleted: true,
          onboardingCompleted: true,
          privacyPolicyAcceptedAt: new Date(),
        },
      });
    } else {
      // One email can be in many chamas — the only thing to refuse is
      // accepting an invite to a chama this account is already part of.
      const alreadyOnThisChama =
        invite.team.ownerId === user.id ||
        !!(await prisma.teamMembership.findUnique({
          where: { teamId_userId: { teamId: invite.teamId, userId: user.id } },
        }));
      if (alreadyOnThisChama) {
        throw new Error("You're already part of this chama.");
      }

      if (!user.idNumber && idNumber.length < 4) throw new Error('Enter a valid ID/passport number.');
      // County is the existing `region`; sub-county is only asked of Kenya residents.
      const needsSubCounty = !user.country || user.country === 'KE';
      if ((!user.region && !county) || (needsSubCounty && !user.residentSubCounty && !residentSubCounty)) {
        throw new Error('Select your resident county and enter your sub-county.');
      }
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          phone: user.phone || phone,
          idNumber: user.idNumber || idNumber,
          // Only fill gaps — never overwrite what the member already gave us.
          region: user.region || county || undefined,
          residentSubCounty: user.residentSubCounty || residentSubCounty || undefined,
          profileCompleted: true,
          onboardingCompleted: true,
          privacyPolicyAcceptedAt: new Date(),
        },
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
        canManageSubTeams: invite.canManageSubTeams,
      },
    });

    await prisma.teamInvite.update({ where: { id: invite.id }, data: { status: 'ACCEPTED' } });
  } catch (err) {
    throw friendlyAccountError(err, { clerkId: 'account', email: 'email address', phone: 'phone number' });
  }

  // The membership is already saved at this point, so a hiccup updating
  // Clerk metadata must not make the person think joining failed.
  try {
    const client = await clerkClient();
    const existingMetadata = clerkUser.publicMetadata || {};
    await client.users.updateUser(clerkUser.id, {
      publicMetadata: { ...existingMetadata, dbId: user.id },
    });
  } catch (err) {
    console.error('⚠️ Could not update Clerk metadata after accepting invite:', err);
  }

  await notifyUser(
    invite.invitedById,
    'Invite accepted',
    `${user.fullName || user.email} has joined ${invite.team.name}.`
  );

  await syncChamaToLudeva(invite.teamId);

  // Take them straight into the chama they just joined.
  await setActiveChamaCookie(invite.teamId);

  revalidatePath('/panel');
  return { success: true };
}
