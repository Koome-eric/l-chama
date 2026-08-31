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

// Moves cash out of the chama's loan account and into an
// InvestmentProduct as a TeamInvestment. This is the pooled-investing
// counterpart to Ludeva's Investment.scope = POOLED — same idea
// (the chama's shared pool goes into a real product), implemented
// locally since L Chama has its own database and product catalog.
export async function investPooledFunds(input: { productId: string; amount: number }) {
  const user = await getCurrentDbUser();
  const ctx = await getChamaContext(user);
  if (!ctx) throw new Error('You are not part of a chama.');
  if (!hasPermission(ctx, 'canInvestPooled')) {
    throw new Error('You do not have permission to invest the pooled fund.');
  }

  const product = await prisma.investmentProduct.findUnique({ where: { id: input.productId } });
  if (!product || !product.isActive) throw new Error('This investment product is not available.');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('Enter a valid amount.');
  if (input.amount < product.minAmount) {
    throw new Error(`Minimum investment for ${product.name} is KES ${product.minAmount.toLocaleString()}.`);
  }
  if (product.maxAmount && input.amount > product.maxAmount) {
    throw new Error(`Maximum investment for ${product.name} is KES ${product.maxAmount.toLocaleString()}.`);
  }

  const account = await prisma.loanAccount.findUnique({ where: { teamId: ctx.team.id } });
  if (!account || account.balance < input.amount) {
    throw new Error('The pooled fund does not have enough balance for this investment.');
  }

  await prisma.$transaction([
    prisma.loanAccount.update({
      where: { teamId: ctx.team.id },
      data: { balance: { decrement: input.amount } },
    }),
    prisma.teamInvestment.create({
      data: {
        teamId: ctx.team.id,
        productId: product.id,
        amount: input.amount,
        investedById: user.id,
      },
    }),
  ]);

  await notifyUser(
    ctx.team.ownerId,
    'Chama investment made',
    `${user.fullName || user.email} invested KES ${input.amount.toLocaleString()} of ${ctx.team.name}'s pooled fund into ${product.name}.`
  );

  revalidatePath('/invest');
  revalidatePath('/panel');
  return { success: true };
}

// Closes an active investment and returns the principal to the loan
// account. Real ROI settlement would happen through Ludeva's own
// systems — this keeps the local record straight for now.
export async function closeInvestment(investmentId: string) {
  const user = await getCurrentDbUser();
  const ctx = await getChamaContext(user);
  if (!ctx) throw new Error('You are not part of a chama.');
  if (!hasPermission(ctx, 'canWithdraw')) {
    throw new Error('You do not have permission to close investments.');
  }

  const investment = await prisma.teamInvestment.findUnique({ where: { id: investmentId } });
  if (!investment || investment.teamId !== ctx.team.id) throw new Error('Investment not found.');
  if (investment.status !== 'ACTIVE') throw new Error('This investment is already closed.');

  await prisma.$transaction([
    prisma.teamInvestment.update({
      where: { id: investmentId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    }),
    prisma.loanAccount.upsert({
      where: { teamId: ctx.team.id },
      create: { teamId: ctx.team.id, balance: investment.amount },
      update: { balance: { increment: investment.amount } },
    }),
  ]);

  revalidatePath('/invest');
  revalidatePath('/panel');
  return { success: true };
}
