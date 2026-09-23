import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/lib/notifications';
import { createMobileMoneyRecipient, initiateTransfer, toPaystackPhone } from '@/lib/paystack';
import { withdrawalFeeRateFor } from '@/lib/withdrawal-fee';
import { friendlyPaymentError } from '@/lib/errors';
import type { SignatoryRole, WithdrawalScope } from '@prisma/client';

/* ────────────────────────────────────────────────────────────── */
/*  Shared engine behind both:                                      */
/*   - Campaign withdrawals (a fundraising payout to the organizer) */
/*   - Chama withdrawals (moving money out of a LoanAccount)        */
/*  Same rule for both: the Admin (Team Leader/creator/owner) and   */
/*  Secretary each get one vote; a payout only fires once both have */
/*  APPROVED, and either REJECTED kills the request.                */
/*  Campaign and external-chama payouts take a platform fee based on */
/*  the REQUESTER's own confirmed Ludeva membership — toll free for a */
/*  verified member, 5% flat for everyone else (see withdrawal-fee.ts). */
/*  A Ludeva-member chama (Team.isLudevaMember) never reaches this   */
/*  engine at all — it withdraws by emailing lchama@ludevaplc.co.ke /  */
/*  invst@ludevaplc.co.ke instead, so createWithdrawalRequest refuses  */
/*  to open an in-app request for one (see the CHAMA branch below).    */
/* ────────────────────────────────────────────────────────────── */

const LUDEVA_MEMBER_WITHDRAWAL_EMAILS = 'lchama@ludevaplc.co.ke or invst@ludevaplc.co.ke';

const ROLE_LABEL: Record<SignatoryRole, string> = {
  ADMIN: 'Team Leader',
  SECRETARY: 'Secretary',
  TREASURER: 'Treasurer',
};

type Signatories = { adminId: string; secretaryId: string | null; treasurerId: string | null };

async function getPoolContext(
  scope: WithdrawalScope,
  scopeId: string
): Promise<{ signatories: Signatories; availableBalance: number; label: string; isLudevaMember: boolean }> {
  if (scope === 'CAMPAIGN') {
    const campaign = await prisma.campaign.findUnique({ where: { id: scopeId } });
    if (!campaign) throw new Error('Campaign not found.');
    return {
      signatories: {
        adminId: campaign.creatorId,
        secretaryId: campaign.secretaryId,
        treasurerId: campaign.treasurerId,
      },
      availableBalance: campaign.raisedAmount - campaign.withdrawnAmount,
      label: campaign.title,
      isLudevaMember: false,
    };
  }

  const team = await prisma.team.findUnique({ where: { id: scopeId }, include: { loanAccount: true } });
  if (!team) throw new Error('Chama not found.');
  return {
    signatories: {
      adminId: team.ownerId,
      secretaryId: team.secretaryId,
      treasurerId: team.treasurerId,
    },
    availableBalance: team.loanAccount?.balance ?? 0,
    label: team.name,
    isLudevaMember: team.isLudevaMember,
  };
}

function roleOf(signatories: Signatories, userId: string): SignatoryRole | null {
  if (signatories.adminId === userId) return 'ADMIN';
  if (signatories.secretaryId === userId) return 'SECRETARY';
  if (signatories.treasurerId === userId) return 'TREASURER';
  return null;
}

/** Everything a UI needs to render "who are the signatories, and where does this request stand". */
export async function getSignatoryStatus(scope: WithdrawalScope, scopeId: string, userId: string) {
  const [{ signatories, availableBalance, label, isLudevaMember }, requester] = await Promise.all([
    getPoolContext(scope, scopeId),
    prisma.user.findUnique({ where: { id: userId }, select: { ludevaMembershipStatus: true } }),
  ]);
  return {
    label,
    availableBalance,
    myRole: roleOf(signatories, userId),
    signatoriesComplete: !!signatories.secretaryId && !!signatories.treasurerId,
    signatories,
    isLudevaMember,
    ludevaMemberWithdrawalContact: LUDEVA_MEMBER_WITHDRAWAL_EMAILS,
    // What the requester would pay if they opened a request right now —
    // lets the UI show the right PayoutCalculator rate before they submit.
    myWithdrawalFeeRate: withdrawalFeeRateFor(requester?.ludevaMembershipStatus),
  };
}

export async function createWithdrawalRequest(input: {
  scope: WithdrawalScope;
  scopeId: string; // campaignId or teamId
  requestedById: string;
  amount: number;
  destinationPhone: string;
  reason?: string;
}) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('Enter a valid amount.');
  const destinationPhone = input.destinationPhone.trim();
  if (!/^(?:\+?254|0)7\d{8}$/.test(destinationPhone) && !/^(?:\+?254|0)1\d{8}$/.test(destinationPhone)) {
    throw new Error('Enter a valid Safaricom number to pay out to, e.g. 07XX XXX XXX.');
  }

  const [{ signatories, availableBalance, label, isLudevaMember }, requester] = await Promise.all([
    getPoolContext(input.scope, input.scopeId),
    prisma.user.findUnique({ where: { id: input.requestedById }, select: { ludevaMembershipStatus: true } }),
  ]);
  if (isLudevaMember) {
    throw new Error(
      `${label} is a Ludeva Plc member chama — withdrawals aren't requested in-app. A member should email ${LUDEVA_MEMBER_WITHDRAWAL_EMAILS} instead.`
    );
  }
  if (!signatories.secretaryId || !signatories.treasurerId) {
    throw new Error(
      `Assign the Secretary and Treasurer for ${label} first — all three signatories must approve a withdrawal.`
    );
  }

  const role = roleOf(signatories, input.requestedById);
  if (!role) throw new Error('Only the Team Leader or Secretary can request a withdrawal.');

  if (input.amount > availableBalance) {
    throw new Error(`Only KES ${availableBalance.toLocaleString()} is available to withdraw.`);
  }

  const feeRate = withdrawalFeeRateFor(requester?.ludevaMembershipStatus);
  const feeAmount = Math.round(input.amount * feeRate * 100) / 100;
  const netAmount = Math.round((input.amount - feeAmount) * 100) / 100;

  const request = await prisma.withdrawalRequest.create({
    data: {
      scope: input.scope,
      campaignId: input.scope === 'CAMPAIGN' ? input.scopeId : undefined,
      teamId: input.scope === 'CHAMA' ? input.scopeId : undefined,
      requestedById: input.requestedById,
      amount: input.amount,
      feeAmount,
      netAmount,
      destinationPhone,
      reason: input.reason?.trim() || undefined,
      approvals: {
        create: (['ADMIN', 'SECRETARY', 'TREASURER'] as const).map((r) => ({
          role: r,
          approverId:
            r === 'ADMIN'
              ? signatories.adminId
              : r === 'SECRETARY'
                ? signatories.secretaryId!
                : signatories.treasurerId!,
          // The requester's own signature is recorded the moment they open the request.
          decision: r === role ? 'APPROVED' : 'PENDING',
          decidedAt: r === role ? new Date() : undefined,
        })),
      },
    },
    include: { approvals: true },
  });

  for (const r of ['ADMIN', 'SECRETARY', 'TREASURER'] as const) {
    if (r === role) continue;
    const approverId = r === 'ADMIN' ? signatories.adminId : r === 'SECRETARY' ? signatories.secretaryId : signatories.treasurerId;
    if (approverId) {
      await notifyUser(
        approverId,
        'Withdrawal awaiting your approval',
        `A KES ${input.amount.toLocaleString()} withdrawal was requested for ${label}. Your sign-off as ${ROLE_LABEL[r]} is needed before it can pay out.`
      );
    }
  }

  return request;
}

export async function decideWithdrawalRequest(input: {
  withdrawalRequestId: string;
  userId: string;
  decision: 'APPROVED' | 'REJECTED';
  comment?: string;
}) {
  const request = await prisma.withdrawalRequest.findUnique({
    where: { id: input.withdrawalRequestId },
    include: { approvals: true },
  });
  if (!request) throw new Error('Withdrawal request not found.');
  if (request.status !== 'AWAITING_APPROVALS') throw new Error('This withdrawal has already been decided.');

  const myApproval = request.approvals.find((a) => a.approverId === input.userId);
  if (!myApproval) throw new Error('You are not a signatory on this withdrawal.');
  if (myApproval.decision !== 'PENDING') throw new Error('You have already recorded your decision on this withdrawal.');

  await prisma.withdrawalApproval.update({
    where: { id: myApproval.id },
    data: { decision: input.decision, comment: input.comment?.trim() || undefined, decidedAt: new Date() },
  });

  if (input.decision === 'REJECTED') {
    await prisma.withdrawalRequest.update({ where: { id: request.id }, data: { status: 'REJECTED' } });
    await notifyUser(
      request.requestedById,
      'Withdrawal rejected',
      `Your KES ${request.amount.toLocaleString()} withdrawal request was rejected by a signatory.${input.comment ? ` "${input.comment}"` : ''}`
    );
    return { status: 'REJECTED' as const };
  }

  // Re-read from the DB (reflects the update above) rather than trusting
  // the in-memory copy — this is what makes "did everyone approve" safe
  // to check right after writing this signatory's own decision.
  const approvals = await prisma.withdrawalApproval.findMany({ where: { withdrawalRequestId: request.id } });
  if (!approvals.every((a) => a.decision === 'APPROVED')) {
    return { status: 'AWAITING_APPROVALS' as const };
  }

  return payoutWithdrawal(request.id);
}

async function payoutWithdrawal(withdrawalRequestId: string) {
  // Atomic claim: if two signatories' approvals race to be "the last one",
  // only the caller that actually flips AWAITING_APPROVALS -> PROCESSING
  // proceeds to move money.
  const claimed = await prisma.withdrawalRequest.updateMany({
    where: { id: withdrawalRequestId, status: 'AWAITING_APPROVALS' },
    data: { status: 'PROCESSING' },
  });
  if (claimed.count === 0) return { status: 'PROCESSING' as const };

  const request = await prisma.withdrawalRequest.findUnique({ where: { id: withdrawalRequestId } });
  if (!request) return { status: 'FAILED' as const };

  try {
    const requester = await prisma.user.findUnique({ where: { id: request.requestedById } });
    const recipient = await createMobileMoneyRecipient({
      name: requester?.fullName || requester?.phone || 'L Chama payout',
      phone: toPaystackPhone(request.destinationPhone),
    });
    const transfer = await initiateTransfer({
      amountKes: request.netAmount,
      recipientCode: recipient.recipient_code,
      reason: request.reason || (request.scope === 'CAMPAIGN' ? 'Campaign withdrawal' : 'Chama withdrawal'),
      reference: request.id,
    });

    await prisma.withdrawalRequest.update({
      where: { id: request.id },
      data: { status: 'PAID', payoutReference: transfer.reference },
    });

    if (request.scope === 'CAMPAIGN' && request.campaignId) {
      await prisma.campaign.update({
        where: { id: request.campaignId },
        data: { withdrawnAmount: { increment: request.amount } },
      });
    } else if (request.scope === 'CHAMA' && request.teamId) {
      await prisma.loanAccount.update({
        where: { teamId: request.teamId },
        data: { balance: { decrement: request.amount } },
      });
    }

    await notifyUser(
      request.requestedById,
      'Withdrawal paid out',
      `Your KES ${request.netAmount.toLocaleString()} withdrawal was approved by both signatories and sent to ${request.destinationPhone}.${request.feeAmount > 0 ? ` (KES ${request.feeAmount.toLocaleString()} platform fee deducted.)` : ''}`
    );
    return { status: 'PAID' as const };
  } catch (err: any) {
    // Keep the raw provider error in failureReason for an admin to debug,
    // but tell the member something they can actually act on.
    const failureReason = String(err?.message ?? 'Unknown error').slice(0, 300);
    const friendlyReason = friendlyPaymentError(err, 'withdrawal payout').message;
    await prisma.withdrawalRequest.update({
      where: { id: request.id },
      data: { status: 'FAILED', failureReason },
    });
    await notifyUser(
      request.requestedById,
      'Withdrawal payout failed',
      `Your KES ${request.amount.toLocaleString()} withdrawal was approved by all signatories, but the payout couldn't go through: ${friendlyReason} An admin can retry it or pay it out manually.`
    );
    return { status: 'FAILED' as const };
  }
}
