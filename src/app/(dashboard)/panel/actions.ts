'use server';

import crypto from 'crypto';
import { Resend } from 'resend';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { notifyUser } from '@/lib/notifications';
import {
  getChamaContext,
  hasPermission,
  permissionsFrom,
  DEFAULT_INVITE_PERMISSIONS,
  type ChamaPermissions,
} from '@/lib/chama';
import { syncChamaToLudeva } from '@/lib/ludeva-sync';

const resend = new Resend(process.env.RESEND_API_KEY);
const INVITE_EXPIRY_DAYS = 7;
const REQUIRED_GUARANTORS = 2;

async function getCurrentDbUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error('You must be signed in.');
  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) throw new Error('Complete onboarding first.');
  return user;
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://lchama.ludevaplc.co.ke';
}

export async function inviteChamaMember(email: string, permissions?: Partial<ChamaPermissions>) {
  const user = await getCurrentDbUser();
  const ctx = await getChamaContext(user);
  if (!ctx) throw new Error('You are not part of a chama.');
  if (!hasPermission(ctx, 'canInvite')) throw new Error('You do not have permission to add members.');
  if (ctx.team.approvalStatus !== 'APPROVED') {
    throw new Error('Your organisation must be approved before you can add members.');
  }

  const grant = permissionsFrom({ ...DEFAULT_INVITE_PERMISSIONS, ...permissions });

  const cleanEmail = email?.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Enter a valid email address.');

  const currentUserEmail = user.email?.trim().toLowerCase();
  if (currentUserEmail && cleanEmail === currentUserEmail) throw new Error("You can't invite yourself.");

  const alreadyMember =
    (ctx.team.owner.email?.trim().toLowerCase() ?? '') === cleanEmail ||
    ctx.team.members.some((m) => (m.user.email?.trim().toLowerCase() ?? '') === cleanEmail);
  if (alreadyMember) throw new Error('This person is already on the chama.');

  const existingInvite = await prisma.teamInvite.findFirst({
    where: { teamId: ctx.team.id, email: cleanEmail, status: 'PENDING' },
  });
  if (existingInvite) throw new Error('An invite is already pending for this email.');

  const token = crypto.randomBytes(24).toString('hex');

  await prisma.teamInvite.create({
    data: {
      teamId: ctx.team.id,
      email: cleanEmail,
      token,
      invitedById: user.id,
      expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      ...grant,
    },
  });

  const acceptUrl = `${appUrl()}/invite/${token}`;

  if (process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: 'L-CHAMA <noreply@lchama.ludevaplc.co.ke>',
        to: [cleanEmail],
        subject: `You're invited to join ${ctx.team.name} on L-CHAMA`,
        html: `
          <h2>You've been invited to join ${ctx.team.name}</h2>
          <p>${user.fullName || user.email} has invited you to join their chama. Once you accept, you'll get access to the shared chama dashboard and loan account.</p>
          <p><a href="${acceptUrl}" style="display:inline-block;padding:10px 20px;background:#0f6b3a;color:#fff;border-radius:6px;text-decoration:none;">Accept Invite</a></p>
          <p>Or copy this link: ${acceptUrl}</p>
          <p style="color:#888;font-size:12px;">This invite expires in ${INVITE_EXPIRY_DAYS} days.</p>
        `,
      });
    } catch (err) {
      console.error('❌ Failed to send chama invite email:', err);
    }
  }

  revalidatePath('/panel');
  return { success: true, acceptUrl };
}

export async function revokeChamaInvite(inviteId: string) {
  const user = await getCurrentDbUser();
  const ctx = await getChamaContext(user);
  if (!ctx) throw new Error('You are not part of a chama.');
  if (!hasPermission(ctx, 'canInvite')) throw new Error('You do not have permission to manage invites.');

  const invite = ctx.team.invites.find((i) => i.id === inviteId);
  if (!invite) throw new Error('Invite not found.');

  await prisma.teamInvite.update({ where: { id: inviteId }, data: { status: 'REVOKED' } });
  revalidatePath('/panel');
  return { success: true };
}

export async function removeChamaMember(membershipId: string) {
  const user = await getCurrentDbUser();
  const ctx = await getChamaContext(user);
  if (!ctx) throw new Error('You are not part of a chama.');
  if (!hasPermission(ctx, 'canRemoveMembers')) throw new Error('You do not have permission to remove members.');

  const target = ctx.team.members.find((m) => m.id === membershipId);
  if (!target) throw new Error('Member not found.');

  await prisma.teamMembership.delete({ where: { id: membershipId } });

  await notifyUser(
    target.userId,
    'Removed from chama',
    `You have been removed from ${ctx.team.name}.`
  );

  await syncChamaToLudeva(ctx.team.id);

  revalidatePath('/panel');
  return { success: true };
}

// Owner, or anyone with canManagePermissions, can change what another
// member is allowed to do. A member can never edit their own permissions
// (avoids self-escalation) and the owner's access can't be changed here —
// it's always full, implicitly.
export async function updateMemberPermissions(membershipId: string, permissions: Partial<ChamaPermissions>) {
  const user = await getCurrentDbUser();
  const ctx = await getChamaContext(user);
  if (!ctx) throw new Error('You are not part of a chama.');
  if (!hasPermission(ctx, 'canManagePermissions')) {
    throw new Error('You do not have permission to manage member roles.');
  }

  const target = ctx.team.members.find((m) => m.id === membershipId);
  if (!target) throw new Error('Member not found.');
  if (target.userId === user.id) throw new Error('You cannot change your own permissions.');

  const next = permissionsFrom({ ...target, ...permissions });

  await prisma.teamMembership.update({ where: { id: membershipId }, data: next });

  await notifyUser(
    target.userId,
    'Your chama role was updated',
    `${user.fullName || user.email} updated what you can access in ${ctx.team.name}.`
  );

  revalidatePath('/panel');
  return { success: true };
}

export async function leaveChama() {
  const user = await getCurrentDbUser();
  const membership = await prisma.teamMembership.findUnique({ where: { userId: user.id } });
  if (!membership) throw new Error('You are not part of a chama.');

  await prisma.teamMembership.delete({ where: { id: membership.id } });
  revalidatePath('/panel');
  return { success: true };
}

export async function adjustLoanAccountBalance(amount: number) {
  const user = await getCurrentDbUser();
  const ctx = await getChamaContext(user);
  if (!ctx) throw new Error('You are not part of a chama.');
  if (!hasPermission(ctx, 'canInvestPooled')) throw new Error('You do not have permission to fund the loan account.');
  if (!Number.isFinite(amount) || amount === 0) throw new Error('Enter a non-zero amount.');

  await prisma.loanAccount.upsert({
    where: { teamId: ctx.team.id },
    create: { teamId: ctx.team.id, balance: Math.max(0, amount) },
    update: { balance: { increment: amount } },
  });

  await syncChamaToLudeva(ctx.team.id);

  revalidatePath('/panel');
  return { success: true };
}

export async function requestLoan(input: { amount: number; purpose?: string }) {
  const user = await getCurrentDbUser();
  const ctx = await getChamaContext(user);
  if (!ctx) throw new Error('You are not part of a chama.');
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Enter a valid loan amount.');
  }

  await prisma.loanRequest.create({
    data: {
      teamId: ctx.team.id,
      requesterId: user.id,
      amount: input.amount,
      purpose: input.purpose?.trim() || undefined,
    },
  });

  revalidatePath('/panel');
  return { success: true };
}

export async function guaranteeLoanRequest(loanRequestId: string) {
  const user = await getCurrentDbUser();
  const ctx = await getChamaContext(user);
  if (!ctx) throw new Error('You are not part of a chama.');

  const request = await prisma.loanRequest.findUnique({
    where: { id: loanRequestId },
    include: { guarantees: true },
  });
  if (!request || request.teamId !== ctx.team.id) throw new Error('Loan request not found.');
  if (request.status !== 'PENDING_GUARANTORS') {
    throw new Error('This request is no longer collecting guarantors.');
  }
  if (request.requesterId === user.id) throw new Error("You can't guarantee your own loan request.");
  if (request.guarantees.some((g: (typeof request.guarantees)[number]) => g.guarantorId === user.id)) {
    throw new Error("You've already guaranteed this request.");
  }

  await prisma.loanGuarantee.create({
    data: { loanRequestId, guarantorId: user.id },
  });

  const guaranteeCount = request.guarantees.length + 1;
  if (guaranteeCount >= REQUIRED_GUARANTORS) {
    await prisma.loanRequest.update({
      where: { id: loanRequestId },
      data: { status: 'PENDING_ADMIN' },
    });
    await notifyUser(
      ctx.team.ownerId,
      'Loan request ready for review',
      `A loan request in ${ctx.team.name} has its ${REQUIRED_GUARANTORS} guarantors and is waiting on your approval.`
    );
  }

  revalidatePath('/panel');
  return { success: true };
}

export async function decideLoanRequest(
  loanRequestId: string,
  decision: 'APPROVE' | 'REJECT',
  repaymentWeeks?: number,
  interestRate?: number
) {
  const user = await getCurrentDbUser();
  const ctx = await getChamaContext(user);
  if (!ctx) throw new Error('You are not part of a chama.');
  if (!hasPermission(ctx, 'canApproveLoans')) throw new Error('You do not have permission to approve or reject loan requests.');

  const request = await prisma.loanRequest.findUnique({ where: { id: loanRequestId } });
  if (!request || request.teamId !== ctx.team.id) throw new Error('Loan request not found.');
  if (request.status !== 'PENDING_ADMIN') {
    throw new Error('This request is not awaiting your decision.');
  }

  if (decision === 'REJECT') {
    await prisma.loanRequest.update({
      where: { id: loanRequestId },
      data: { status: 'REJECTED', decidedById: user.id, decidedAt: new Date() },
    });
    await notifyUser(
      request.requesterId,
      'Loan request rejected',
      `Your loan request for KES ${request.amount.toLocaleString()} in ${ctx.team.name} was not approved.`
    );
    revalidatePath('/panel');
    return { success: true };
  }

  const weeks = Math.max(1, Math.round(repaymentWeeks ?? 4));
  // Chama loans start from 3% — the Team Leader can charge more, never less.
  const rate = Math.max(3, interestRate ?? 3);

  const account = await prisma.loanAccount.findUnique({ where: { teamId: ctx.team.id } });
  if (!account || account.balance < request.amount) {
    throw new Error('The loan account does not have enough balance to cover this loan.');
  }

  const totalRepayable = Math.round(request.amount * (1 + rate / 100) * 100) / 100;
  const installment = Math.floor((totalRepayable / weeks) * 100) / 100;
  const lastInstallment = Math.round((totalRepayable - installment * (weeks - 1)) * 100) / 100;

  await prisma.$transaction([
    prisma.loanAccount.update({
      where: { teamId: ctx.team.id },
      data: { balance: { decrement: request.amount } },
    }),
    prisma.loanRequest.update({
      where: { id: loanRequestId },
      data: {
        status: 'ACTIVE',
        decidedById: user.id,
        decidedAt: new Date(),
        repaymentWeeks: weeks,
        interestRate: rate,
      },
    }),
    prisma.loanRepayment.createMany({
      data: Array.from({ length: weeks }, (_, i) => ({
        loanRequestId,
        weekNumber: i + 1,
        dueDate: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000),
        amount: i === weeks - 1 ? lastInstallment : installment,
      })),
    }),
  ]);

  await notifyUser(
    request.requesterId,
    'Loan approved',
    `Your loan request for KES ${request.amount.toLocaleString()} in ${ctx.team.name} was approved at ${rate}% interest, repayable over ${weeks} week(s) — total repayable KES ${totalRepayable.toLocaleString()}.`
  );

  revalidatePath('/panel');
  return { success: true };
}

export async function markRepaymentPaid(repaymentId: string) {
  const user = await getCurrentDbUser();
  const ctx = await getChamaContext(user);
  if (!ctx) throw new Error('You are not part of a chama.');
  if (!hasPermission(ctx, 'canApproveLoans')) throw new Error('You do not have permission to record repayments.');

  const repayment = await prisma.loanRepayment.findUnique({
    where: { id: repaymentId },
    include: { loanRequest: true },
  });
  if (!repayment || repayment.loanRequest.teamId !== ctx.team.id) {
    throw new Error('Repayment not found.');
  }
  if (repayment.paid) return { success: true };

  await prisma.$transaction([
    prisma.loanRepayment.update({
      where: { id: repaymentId },
      data: { paid: true, paidAt: new Date() },
    }),
    // Repayments (principal + interest) flow back into the pool, the
    // same pot the next loan gets funded from.
    prisma.loanAccount.upsert({
      where: { teamId: ctx.team.id },
      create: { teamId: ctx.team.id, balance: repayment.amount },
      update: { balance: { increment: repayment.amount } },
    }),
  ]);

  const remaining = await prisma.loanRepayment.count({
    where: { loanRequestId: repayment.loanRequestId, paid: false },
  });
  if (remaining === 0) {
    await prisma.loanRequest.update({
      where: { id: repayment.loanRequestId },
      data: { status: 'REPAID' },
    });
  }

  await syncChamaToLudeva(ctx.team.id);

  revalidatePath('/panel');
  return { success: true };
}
