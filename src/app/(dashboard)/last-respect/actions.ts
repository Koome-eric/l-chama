'use server';

import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getChamaContext, hasPermission } from '@/lib/chama';
import { notifyUser } from '@/lib/notifications';

async function getCurrentDbUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error('You must be signed in.');
  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) throw new Error('Complete onboarding first.');
  return user;
}

// Team Leader (or anyone with canInvestPooled — the same people trusted
// to move pooled money around) tops up the Last Respect fund, the same
// way the loan account is funded.
export async function fundLastRespect(amount: number) {
  const user = await getCurrentDbUser();
  const ctx = await getChamaContext(user);
  if (!ctx) throw new Error('You are not part of a chama.');
  if (!ctx.team.hasLastRespectCover) throw new Error('Last Respect Cover is not enabled for this chama.');
  if (!hasPermission(ctx, 'canInvestPooled')) throw new Error('You do not have permission to fund Last Respect Cover.');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a valid amount.');

  await prisma.lastRespectFund.upsert({
    where: { teamId: ctx.team.id },
    create: { teamId: ctx.team.id, balance: amount },
    update: { balance: { increment: amount } },
  });

  revalidatePath('/last-respect');
  return { success: true };
}

// Any member can raise a claim — for their own loss or a close family
// member's. The Team Leader (or anyone with canApproveLoans — the same
// people trusted with financial decisions) reviews and pays it out.
export async function raiseLastRespectClaim(input: { deceasedName: string; relation: string; amount: number; notes?: string }) {
  const user = await getCurrentDbUser();
  const ctx = await getChamaContext(user);
  if (!ctx) throw new Error('You are not part of a chama.');
  if (!ctx.team.hasLastRespectCover) throw new Error('Last Respect Cover is not enabled for this chama.');
  if (!input.deceasedName.trim()) throw new Error('Enter a name.');
  if (!input.relation.trim()) throw new Error('Enter the relation to the deceased.');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('Enter a valid claim amount.');

  const claim = await prisma.lastRespectClaim.create({
    data: {
      teamId: ctx.team.id,
      claimantId: user.id,
      deceasedName: input.deceasedName.trim(),
      relation: input.relation.trim(),
      amount: input.amount,
      notes: input.notes?.trim() || null,
    },
  });

  await notifyUser(
    ctx.team.ownerId,
    'Last Respect Cover claim',
    `${user.fullName || user.email} raised a Last Respect claim for ${input.deceasedName} in ${ctx.team.name}.`
  );

  revalidatePath('/last-respect');
  return { success: true, claimId: claim.id };
}

export async function decideLastRespectClaim(claimId: string, decision: 'APPROVE' | 'REJECT') {
  const user = await getCurrentDbUser();
  const ctx = await getChamaContext(user);
  if (!ctx) throw new Error('You are not part of a chama.');
  if (!hasPermission(ctx, 'canApproveLoans')) throw new Error('You do not have permission to decide claims.');

  const claim = await prisma.lastRespectClaim.findUnique({ where: { id: claimId } });
  if (!claim || claim.teamId !== ctx.team.id) throw new Error('Claim not found.');
  if (claim.status !== 'PENDING') throw new Error('This claim has already been decided.');

  await prisma.lastRespectClaim.update({
    where: { id: claimId },
    data: { status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', decidedById: user.id, decidedAt: new Date() },
  });

  await notifyUser(
    claim.claimantId,
    decision === 'APPROVE' ? 'Last Respect claim approved' : 'Last Respect claim rejected',
    decision === 'APPROVE'
      ? `Your claim for ${claim.deceasedName} was approved and will be paid out.`
      : `Your claim for ${claim.deceasedName} was not approved.`
  );

  revalidatePath('/last-respect');
  return { success: true };
}

// Pays out an approved claim from the fund.
export async function payLastRespectClaim(claimId: string) {
  const user = await getCurrentDbUser();
  const ctx = await getChamaContext(user);
  if (!ctx) throw new Error('You are not part of a chama.');
  if (!hasPermission(ctx, 'canApproveLoans')) throw new Error('You do not have permission to pay out claims.');

  const claim = await prisma.lastRespectClaim.findUnique({ where: { id: claimId } });
  if (!claim || claim.teamId !== ctx.team.id) throw new Error('Claim not found.');
  if (claim.status !== 'APPROVED') throw new Error('Only approved claims can be paid out.');

  const fund = await prisma.lastRespectFund.findUnique({ where: { teamId: ctx.team.id } });
  if (!fund || fund.balance < claim.amount) throw new Error('The Last Respect fund does not have enough balance.');

  await prisma.$transaction([
    prisma.lastRespectFund.update({ where: { teamId: ctx.team.id }, data: { balance: { decrement: claim.amount } } }),
    prisma.lastRespectClaim.update({ where: { id: claimId }, data: { status: 'PAID' } }),
  ]);

  await notifyUser(claim.claimantId, 'Last Respect claim paid', `Your claim for ${claim.deceasedName} of KES ${claim.amount.toLocaleString()} has been paid out.`);

  revalidatePath('/last-respect');
  return { success: true };
}
