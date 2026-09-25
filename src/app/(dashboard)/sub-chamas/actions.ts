'use server';

import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { notifyUser } from '@/lib/notifications';
import { getChamaContext, hasPermission } from '@/lib/chama';

async function getCurrentDbUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error('You must be signed in.');
  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) throw new Error('Complete onboarding first.');
  return user;
}

async function requireChamaCtx() {
  const user = await getCurrentDbUser();
  const ctx = await getChamaContext(user);
  if (!ctx) throw new Error('You are not part of a chama.');
  return { user, ctx };
}

// Sub-chamas are purely organisational — they never touch the loan
// account, savings, or withdrawals, so only the chama's approval status
// (not any financial state) gates creating one.
export async function createSubTeam(input: { name: string; leaderMembershipId: string }) {
  const { user, ctx } = await requireChamaCtx();
  if (!hasPermission(ctx, 'canManageSubTeams')) {
    throw new Error('You do not have permission to create sub-chamas.');
  }
  if (ctx.team.approvalStatus !== 'APPROVED') {
    throw new Error('Your chama must be approved before you can create sub-chamas.');
  }

  const name = input.name?.trim();
  if (!name) throw new Error('Give the sub-chama a name.');

  const leaderMember = ctx.team.members.find((m) => m.id === input.leaderMembershipId);
  if (!leaderMember) throw new Error("Pick a leader from the chama's current members.");

  const alreadyLeads = await prisma.subTeam.findFirst({
    where: { teamId: ctx.team.id, leaderId: leaderMember.userId },
  });
  if (alreadyLeads) throw new Error('This member already leads a sub-chama.');

  const nameTaken = await prisma.subTeam.findFirst({
    where: { teamId: ctx.team.id, name: { equals: name, mode: 'insensitive' } },
  });
  if (nameTaken) throw new Error('A sub-chama with that name already exists.');

  const subTeam = await prisma.subTeam.create({
    data: { teamId: ctx.team.id, name, leaderId: leaderMember.userId, createdById: user.id },
  });

  await notifyUser(
    leaderMember.userId,
    'You are now a sub-chama leader',
    `${user.fullName || user.email} made you the leader of "${name}" inside ${ctx.team.name}.`
  );

  revalidatePath('/sub-chamas');
  return { success: true, subTeamId: subTeam.id };
}

export async function renameSubTeam(subTeamId: string, name: string) {
  const { ctx } = await requireChamaCtx();
  if (!hasPermission(ctx, 'canManageSubTeams')) {
    throw new Error('You do not have permission to manage sub-chamas.');
  }

  const clean = name?.trim();
  if (!clean) throw new Error('Enter a name.');

  const subTeam = await prisma.subTeam.findUnique({ where: { id: subTeamId } });
  if (!subTeam || subTeam.teamId !== ctx.team.id) throw new Error('Sub-chama not found.');

  const nameTaken = await prisma.subTeam.findFirst({
    where: { teamId: ctx.team.id, name: { equals: clean, mode: 'insensitive' }, id: { not: subTeamId } },
  });
  if (nameTaken) throw new Error('A sub-chama with that name already exists.');

  await prisma.subTeam.update({ where: { id: subTeamId }, data: { name: clean } });
  revalidatePath('/sub-chamas');
  return { success: true };
}

export async function changeSubTeamLeader(subTeamId: string, newLeaderMembershipId: string) {
  const { user, ctx } = await requireChamaCtx();
  if (!hasPermission(ctx, 'canManageSubTeams')) {
    throw new Error('You do not have permission to manage sub-chamas.');
  }

  const subTeam = await prisma.subTeam.findUnique({ where: { id: subTeamId } });
  if (!subTeam || subTeam.teamId !== ctx.team.id) throw new Error('Sub-chama not found.');

  const newLeaderMember = ctx.team.members.find((m) => m.id === newLeaderMembershipId);
  if (!newLeaderMember) throw new Error("Pick a leader from the chama's current members.");

  const alreadyLeadsAnother = await prisma.subTeam.findFirst({
    where: { teamId: ctx.team.id, leaderId: newLeaderMember.userId, id: { not: subTeamId } },
  });
  if (alreadyLeadsAnother) throw new Error('This member already leads another sub-chama.');

  // If the new leader was previously just a regular member of this same
  // sub-chama, drop that membership row — leading it is enough, they
  // don't also need a separate member row within their own sub-chama.
  await prisma.$transaction([
    prisma.subTeamMembership.deleteMany({ where: { subTeamId, userId: newLeaderMember.userId } }),
    prisma.subTeam.update({ where: { id: subTeamId }, data: { leaderId: newLeaderMember.userId } }),
  ]);

  await notifyUser(
    newLeaderMember.userId,
    'You are now a sub-chama leader',
    `${user.fullName || user.email} made you the leader of "${subTeam.name}" inside ${ctx.team.name}.`
  );

  revalidatePath('/sub-chamas');
  return { success: true };
}

export async function deleteSubTeam(subTeamId: string) {
  const { ctx } = await requireChamaCtx();
  if (!hasPermission(ctx, 'canManageSubTeams')) {
    throw new Error('You do not have permission to manage sub-chamas.');
  }

  const subTeam = await prisma.subTeam.findUnique({ where: { id: subTeamId } });
  if (!subTeam || subTeam.teamId !== ctx.team.id) throw new Error('Sub-chama not found.');

  // Members and the leader simply fall back into the chama's unassigned
  // pool — they stay full chama members throughout, only the grouping
  // and the leadership role disappear.
  await prisma.subTeam.delete({ where: { id: subTeamId } });

  revalidatePath('/sub-chamas');
  return { success: true };
}

// Callable by the chama admin (canManageSubTeams) OR the sub-chama's own
// leader — either can staff a sub-group from the chama's existing member
// list. Only ever pulls from members already on the parent chama, and
// only those not already sitting in a different sub-chama.
export async function addSubTeamMember(subTeamId: string, membershipId: string) {
  const { user, ctx } = await requireChamaCtx();

  const subTeam = await prisma.subTeam.findUnique({ where: { id: subTeamId } });
  if (!subTeam || subTeam.teamId !== ctx.team.id) throw new Error('Sub-chama not found.');

  const isLeader = subTeam.leaderId === user.id;
  if (!hasPermission(ctx, 'canManageSubTeams') && !isLeader) {
    throw new Error('Only the chama admin or this sub-chama\'s leader can add members.');
  }

  const member = ctx.team.members.find((m) => m.id === membershipId);
  if (!member) throw new Error('That person is not a member of this chama.');
  if (member.userId === subTeam.leaderId) throw new Error('This member already leads the sub-chama.');

  const existing = await prisma.subTeamMembership.findUnique({ where: { userId: member.userId } });
  if (existing) {
    throw new Error(
      existing.subTeamId === subTeamId
        ? 'This member is already in this sub-chama.'
        : 'This member is already in a different sub-chama — move them from there first.'
    );
  }

  await prisma.subTeamMembership.create({ data: { subTeamId, userId: member.userId } });

  await notifyUser(
    member.userId,
    'Added to a sub-chama',
    `${user.fullName || user.email} added you to "${subTeam.name}" inside ${ctx.team.name}.`
  );

  revalidatePath('/sub-chamas');
  return { success: true };
}

export async function removeSubTeamMember(subTeamMembershipId: string) {
  const { user, ctx } = await requireChamaCtx();

  const row = await prisma.subTeamMembership.findUnique({
    where: { id: subTeamMembershipId },
    include: { subTeam: true },
  });
  if (!row || row.subTeam.teamId !== ctx.team.id) throw new Error('Not found.');

  const isLeader = row.subTeam.leaderId === user.id;
  if (!hasPermission(ctx, 'canManageSubTeams') && !isLeader) {
    throw new Error('Only the chama admin or this sub-chama\'s leader can remove members.');
  }

  await prisma.subTeamMembership.delete({ where: { id: subTeamMembershipId } });

  await notifyUser(
    row.userId,
    'Removed from a sub-chama',
    `You were removed from "${row.subTeam.name}" inside ${ctx.team.name}. You're still a full member of the chama.`
  );

  revalidatePath('/sub-chamas');
  return { success: true };
}

// Moves a member straight from one sub-chama to another — admin
// (canManageSubTeams) only, since it crosses a boundary a single leader
// doesn't have authority over on their own.
export async function moveSubTeamMember(subTeamMembershipId: string, targetSubTeamId: string) {
  const { user, ctx } = await requireChamaCtx();
  if (!hasPermission(ctx, 'canManageSubTeams')) {
    throw new Error('You do not have permission to move members between sub-chamas.');
  }

  const row = await prisma.subTeamMembership.findUnique({ where: { id: subTeamMembershipId } });
  if (!row) throw new Error('Not found.');

  const target = await prisma.subTeam.findUnique({ where: { id: targetSubTeamId } });
  if (!target || target.teamId !== ctx.team.id) throw new Error('Target sub-chama not found.');
  if (target.leaderId === row.userId) throw new Error('This member leads that sub-chama already.');
  if (target.id === row.subTeamId) return { success: true };

  await prisma.subTeamMembership.update({ where: { id: subTeamMembershipId }, data: { subTeamId: targetSubTeamId } });

  await notifyUser(
    row.userId,
    'Moved to a different sub-chama',
    `${user.fullName || user.email} moved you to "${target.name}" inside ${ctx.team.name}.`
  );

  revalidatePath('/sub-chamas');
  return { success: true };
}
