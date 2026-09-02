'use server';

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { isPlatformAdmin } from '@/lib/admin';
import { notifyUser } from '@/lib/notifications';
import { syncChamaToLudeva } from '@/lib/ludeva-sync';

async function requireAdmin() {
  const { userId: clerkId } = await auth();
  if (!isPlatformAdmin(clerkId)) throw new Error('You are not authorized to review organisations.');
}

export async function approveOrganisation(teamId: string) {
  await requireAdmin();

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new Error('Organisation not found.');
  if (team.approvalStatus !== 'PENDING_APPROVAL') throw new Error('This organisation has already been decided.');

  await prisma.team.update({
    where: { id: teamId },
    data: { approvalStatus: 'APPROVED', decidedAt: new Date() },
  });

  await notifyUser(
    team.ownerId,
    'Organisation approved',
    `${team.name} has been approved. You can now access your chama dashboard.`
  );

  await syncChamaToLudeva(teamId);

  revalidatePath('/admin');
  return { success: true };
}

export async function rejectOrganisation(teamId: string, reason?: string) {
  await requireAdmin();

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new Error('Organisation not found.');
  if (team.approvalStatus !== 'PENDING_APPROVAL') throw new Error('This organisation has already been decided.');

  await prisma.team.update({
    where: { id: teamId },
    data: {
      approvalStatus: 'REJECTED',
      decidedAt: new Date(),
      rejectionReason: reason?.trim() || undefined,
    },
  });

  await notifyUser(
    team.ownerId,
    'Organisation not approved',
    `${team.name} was not approved.${reason ? ` Reason: ${reason}` : ''}`
  );

  revalidatePath('/admin');
  return { success: true };
}

export async function verifyCampaign(campaignId: string) {
  await requireAdmin();

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error('Campaign not found.');

  await prisma.campaign.update({ where: { id: campaignId }, data: { verified: true } });

  await notifyUser(
    campaign.creatorId,
    'Campaign verified',
    `${campaign.title} has been verified and now shows the verified badge.`
  );

  revalidatePath('/admin');
  revalidatePath('/campaigns');
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true };
}

export async function unverifyCampaign(campaignId: string) {
  await requireAdmin();

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error('Campaign not found.');

  await prisma.campaign.update({ where: { id: campaignId }, data: { verified: false } });

  revalidatePath('/admin');
  revalidatePath('/campaigns');
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true };
}

// ─────────────────────────────────────────────
// Investment Products — local product catalog (mirrors Ludeva's
// InvestmentProduct: MMF, stocks, bonds, fixed deposits) that chamas
// invest their pooled fund into from /invest.
// ─────────────────────────────────────────────

export async function createInvestmentProduct(input: {
  name: string;
  type: 'MMF' | 'STOCK' | 'BOND' | 'FIXED_DEPOSIT';
  description?: string;
  roi: number;
  roiMax?: number | null;
  duration: number;
  minAmount: number;
  maxAmount?: number | null;
}) {
  await requireAdmin();

  if (!input.name.trim()) throw new Error('Product name is required.');
  if (!Number.isFinite(input.roi) || input.roi < 0) throw new Error('Enter a valid ROI.');
  if (!Number.isFinite(input.duration) || input.duration <= 0) throw new Error('Enter a valid term in months.');
  if (!Number.isFinite(input.minAmount) || input.minAmount <= 0) throw new Error('Enter a valid minimum amount.');
  if (input.maxAmount != null && input.maxAmount < input.minAmount) {
    throw new Error('Maximum amount must be greater than the minimum.');
  }
  if (input.roiMax != null && input.roiMax < input.roi) {
    throw new Error('Maximum rate must be greater than the minimum rate.');
  }

  await prisma.investmentProduct.create({
    data: {
      name: input.name.trim(),
      type: input.type,
      description: input.description?.trim() || null,
      roi: input.roi,
      roiMax: input.roiMax ?? null,
      duration: input.duration,
      minAmount: input.minAmount,
      maxAmount: input.maxAmount ?? null,
    },
  });

  revalidatePath('/admin');
  revalidatePath('/invest');
  return { success: true };
}

export async function updateInvestmentProduct(
  productId: string,
  input: {
    name: string;
    type: 'MMF' | 'STOCK' | 'BOND' | 'FIXED_DEPOSIT';
    description?: string;
    roi: number;
    roiMax?: number | null;
    duration: number;
    minAmount: number;
    maxAmount?: number | null;
  }
) {
  await requireAdmin();

  const product = await prisma.investmentProduct.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found.');
  if (!input.name.trim()) throw new Error('Product name is required.');
  if (input.maxAmount != null && input.maxAmount < input.minAmount) {
    throw new Error('Maximum amount must be greater than the minimum.');
  }
  if (input.roiMax != null && input.roiMax < input.roi) {
    throw new Error('Maximum rate must be greater than the minimum rate.');
  }

  await prisma.investmentProduct.update({
    where: { id: productId },
    data: {
      name: input.name.trim(),
      type: input.type,
      description: input.description?.trim() || null,
      roi: input.roi,
      roiMax: input.roiMax ?? null,
      duration: input.duration,
      minAmount: input.minAmount,
      maxAmount: input.maxAmount ?? null,
    },
  });

  revalidatePath('/admin');
  revalidatePath('/invest');
  return { success: true };
}

export async function toggleInvestmentProductActive(productId: string) {
  await requireAdmin();

  const product = await prisma.investmentProduct.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found.');

  await prisma.investmentProduct.update({
    where: { id: productId },
    data: { isActive: !product.isActive },
  });

  revalidatePath('/admin');
  revalidatePath('/invest');
  return { success: true };
}

// ─────────────────────────────────────────────
// Member Reports — Google Sheets performance pipeline (mirrors Ludeva's
// MemberReport pipeline). Rows arrive either via the /api/member-reports/sync
// webhook (an Apps Script push, same idea as Ludeva's Sheets-to-DB job) or
// pasted here as a CSV export for a one-off sync. Expected header row:
// email,name,date,principal,rate,roi,withdrawal,closingBalance,period,notes
// ─────────────────────────────────────────────

function parseMemberReportCsv(csvText: string) {
  const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error('CSV needs a header row plus at least one data row.');

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);

  const emailIdx = col('email');
  if (emailIdx === -1) throw new Error('CSV header must include an "email" column.');

  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    const get = (name: string) => {
      const idx = col(name);
      return idx === -1 ? undefined : cells[idx] || undefined;
    };
    return {
      memberEmail: cells[emailIdx]?.toLowerCase(),
      memberName: get('name'),
      date: get('date'),
      principal: get('principal'),
      rate: get('rate'),
      roi: get('roi'),
      withdrawal: get('withdrawal'),
      closingBal: get('closingbalance') || get('closing_balance') || get('closingbal'),
      periodLabel: get('period'),
      notes: get('notes'),
    };
  });
}

export async function syncMemberReportsCsv(csvText: string) {
  await requireAdmin();

  const rows = parseMemberReportCsv(csvText).filter((r) => r.memberEmail);
  if (rows.length === 0) throw new Error('No valid rows found in that CSV.');

  const emails = [...new Set(rows.map((r) => r.memberEmail!))];
  const users = await prisma.user.findMany({ where: { email: { in: emails } } });
  const userByEmail = new Map(
    users
      .filter((u): u is typeof u & { email: string } => !!u.email)
      .map((u) => [u.email.toLowerCase(), u])
  );

  const memberships = await prisma.teamMembership.findMany({
    where: { userId: { in: users.map((u) => u.id) } },
  });
  const teamIdByUserId = new Map(memberships.map((m) => [m.userId, m.teamId]));

  const owners = await prisma.team.findMany({ where: { ownerId: { in: users.map((u) => u.id) } } });
  const teamIdByOwnerId = new Map(owners.map((t) => [t.ownerId, t.id]));

  await prisma.$transaction(
    rows.map((row) => {
      const user = userByEmail.get(row.memberEmail!);
      const teamId = user ? teamIdByOwnerId.get(user.id) || teamIdByUserId.get(user.id) || null : null;
      return prisma.memberReport.create({
        data: { ...row, memberEmail: row.memberEmail!, teamId },
      });
    })
  );

  revalidatePath('/admin');
  revalidatePath('/reports');
  return { success: true, imported: rows.length, matched: rows.filter((r) => teamIdByOwnerId.get(userByEmail.get(r.memberEmail!)?.id || '') || teamIdByUserId.get(userByEmail.get(r.memberEmail!)?.id || '')).length };
}

export async function deleteMemberReport(reportId: string) {
  await requireAdmin();
  await prisma.memberReport.delete({ where: { id: reportId } });
  revalidatePath('/admin');
  revalidatePath('/reports');
  return { success: true };
}
