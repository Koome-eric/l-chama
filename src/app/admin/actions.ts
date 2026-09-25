'use server';

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { isPlatformAdmin } from '@/lib/admin';
import {
  clearAdminSession,
  getAdminSessionEmail,
  hashPassword,
  isSuperAdminCredentials,
  isSuperAdminEmail,
  setAdminSession,
  verifyPassword,
} from '@/lib/admin-auth';
import { notifyUser } from '@/lib/notifications';
import { syncChamaToLudeva } from '@/lib/ludeva-sync';
import { friendlyAccountError } from '@/lib/errors';

// The 8 operational admin-panel sections that can be individually
// granted/revoked per admin — see AdminAccount in prisma/schema.prisma.
// The super admin (env pair or a Clerk-allowlisted platform admin) always
// has every one of these, regardless of what's stored in the DB, and is
// never gated by them.
const ADMIN_PERMISSION_KEYS = [
  'canManageOrganisations',
  'canManageCampaigns',
  'canManageProducts',
  'canManageMemberReports',
  'canManageSavings',
  'canManagePayments',
  'canManageJuniorAccounts',
  'canManageLudevaMembers',
  // Managing OTHER admin accounts (see the list, invite, delete) — kept in
  // the same permissions record as the sections above so it flows through
  // requireAdmin()/create/update the same way, but it's handled with extra
  // care everywhere it's used: only the real super admin can ever grant or
  // revoke it (see requireSuperAdmin()-gated updateAdminAccount /
  // updateAdminPermissions below, and the strip in createAdminAccount), and
  // it never applies to the super admin account, which isn't a row here.
  'canManageAdmins',
] as const;

type AdminPermissionKey = (typeof ADMIN_PERMISSION_KEYS)[number];
type AdminPermissions = Record<AdminPermissionKey, boolean>;

const FULL_PERMISSIONS: AdminPermissions = ADMIN_PERMISSION_KEYS.reduce(
  (acc, key) => ({ ...acc, [key]: true }),
  {} as AdminPermissions
);

async function requireAdmin() {
  const { userId: clerkId } = await auth();
  if (isPlatformAdmin(clerkId)) {
    return { email: null as string | null, isSuper: true, permissions: FULL_PERMISSIONS };
  }

  const email = await getAdminSessionEmail();
  if (!email) throw new Error('You are not authorized to review organisations.');

  const isSuper = isSuperAdminEmail(email);
  if (isSuper) {
    return { email, isSuper: true, permissions: FULL_PERMISSIONS };
  }

  const account = await prisma.adminAccount.findUnique({ where: { email } });
  if (!account) throw new Error('You are not authorized to review organisations.');

  const permissions = ADMIN_PERMISSION_KEYS.reduce(
    (acc, key) => ({ ...acc, [key]: account[key] }),
    {} as AdminPermissions
  );
  return { email, isSuper: false, permissions };
}

// Admin-account management (create/edit/delete other admins) is reserved
// for the super admin — the ADMIN_EMAIL/ADMIN_PASSWORD pair from the
// environment (or a Clerk-allowlisted platform admin).
async function requireSuperAdmin() {
  const ctx = await requireAdmin();
  if (!ctx.isSuper) throw new Error('Only the super admin can manage admin accounts.');
  return ctx;
}

// A super admin can delegate "see other admins, invite new ones, delete
// existing ones" to a regular admin via canManageAdmins — but editing an
// existing admin's details/permissions (updateAdminAccount,
// updateAdminPermissions) and granting canManageAdmins itself both stay
// requireSuperAdmin()-only below, so a delegated admin can never edit a
// peer or mint another delegate. It never covers the super admin account,
// which isn't a row in this table and so can't be seen, invited over, or
// deleted here regardless.
async function requireAdminManager() {
  const ctx = await requireAdmin();
  if (!ctx.isSuper && !ctx.permissions.canManageAdmins) {
    throw new Error('The super admin has not given your account access to manage other admins.');
  }
  return ctx;
}

// Like requireAdmin(), but also checks the admin has been granted this
// specific section. The super admin always passes.
async function requirePermission(key: AdminPermissionKey) {
  const ctx = await requireAdmin();
  if (!ctx.isSuper && !ctx.permissions[key]) {
    throw new Error('The super admin has not given your account access to this section.');
  }
  return ctx;
}

export async function loginAdmin(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (isSuperAdminCredentials(email, password)) {
    await setAdminSession(email);
    return { success: true as const };
  }

  const admin = await prisma.adminAccount.findUnique({ where: { email: email.toLowerCase() } });
  if (admin && verifyPassword(password, admin.passwordHash)) {
    await setAdminSession(admin.email);
    return { success: true as const };
  }

  return { success: false as const, error: 'Invalid email or password.' };
}

// ─────────────────────────────────────────────
// Admin accounts — the super admin can create, edit and delete the
// other admins who can sign in to /admin with their own email/password.
// ─────────────────────────────────────────────

export async function createAdminAccount(input: {
  email: string;
  password: string;
  fullName?: string;
  permissions?: Partial<AdminPermissions>;
}) {
  const ctx = await requireAdminManager();

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes('@')) throw new Error('Enter a valid email address.');
  if (isSuperAdminEmail(email)) throw new Error('That email is already used by the super admin.');
  if (!input.password || input.password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  const existing = await prisma.adminAccount.findUnique({ where: { email } });
  if (existing) throw new Error('An admin with that email already exists.');

  // A delegated (non-super) admin manager can invite new admins, but can
  // never hand out canManageAdmins itself — only the real super admin can
  // create another delegate. Silently drop it rather than error, so the
  // rest of the invite still goes through with an ordinary admin created.
  const permissions = { ...(input.permissions ?? {}) };
  if (!ctx.isSuper) delete permissions.canManageAdmins;

  await prisma.adminAccount.create({
    data: {
      email,
      fullName: input.fullName?.trim() || null,
      passwordHash: hashPassword(input.password),
      // Defaults to full access on the operational sections (matching
      // schema defaults) unless unchecked; canManageAdmins itself defaults
      // to false unless the super admin explicitly grants it.
      ...permissions,
    },
  });

  revalidatePath('/admin');
  return { success: true };
}

export async function updateAdminAccount(
  adminId: string,
  input: { email: string; password?: string; fullName?: string; permissions?: Partial<AdminPermissions> }
) {
  await requireSuperAdmin();

  const admin = await prisma.adminAccount.findUnique({ where: { id: adminId } });
  if (!admin) throw new Error('Admin not found.');

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes('@')) throw new Error('Enter a valid email address.');
  if (isSuperAdminEmail(email)) throw new Error('That email is reserved for the super admin.');
  if (input.password && input.password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  if (email !== admin.email) {
    const clash = await prisma.adminAccount.findUnique({ where: { email } });
    if (clash) throw new Error('An admin with that email already exists.');
  }

  await prisma.adminAccount.update({
    where: { id: adminId },
    data: {
      email,
      fullName: input.fullName?.trim() || null,
      ...(input.password ? { passwordHash: hashPassword(input.password) } : {}),
      // Editable at any time, including for admins created before this
      // feature existed — that's the whole point of a separate field here
      // rather than only being settable at creation.
      ...(input.permissions ?? {}),
    },
  });

  revalidatePath('/admin');
  return { success: true };
}

// Dedicated action for flipping just one admin's section access — used by
// the permission toggles in the admin table, so the super admin doesn't
// have to open the full edit dialog (and re-enter/skip a password) just to
// grant or revoke one section.
export async function updateAdminPermissions(adminId: string, permissions: Partial<AdminPermissions>) {
  await requireSuperAdmin();

  const admin = await prisma.adminAccount.findUnique({ where: { id: adminId } });
  if (!admin) throw new Error('Admin not found.');

  const data: Partial<AdminPermissions> = {};
  for (const key of ADMIN_PERMISSION_KEYS) {
    if (key in permissions) data[key] = !!permissions[key];
  }

  await prisma.adminAccount.update({ where: { id: adminId }, data });

  revalidatePath('/admin');
  return { success: true };
}

export async function deleteAdminAccount(adminId: string) {
  await requireAdminManager();

  await prisma.adminAccount.delete({ where: { id: adminId } });

  revalidatePath('/admin');
  return { success: true };
}

export async function logoutAdmin() {
  await clearAdminSession();
}

export async function approveOrganisation(teamId: string) {
  await requirePermission('canManageOrganisations');

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
  await requirePermission('canManageOrganisations');

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

// Whether a chama is one of Ludeva Plc's own member chamas — set here
// only, never by the chama itself. Ludeva-member chamas withdraw by
// emailing lchama@ludevaplc.co.ke / invst@ludevaplc.co.ke instead of the
// in-app 2-signatory flow, and pay no platform withdrawal fee (see
// src/lib/withdrawals.ts). Everyone else defaults to non-member (fee-
// paying, in-app flow) — this only needs setting for the exception.
export async function setTeamLudevaMembership(teamId: string, isLudevaMember: boolean) {
  await requirePermission('canManageOrganisations');

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new Error('Organisation not found.');

  await prisma.team.update({ where: { id: teamId }, data: { isLudevaMember } });

  revalidatePath('/admin');
  return { success: true };
}

// Permanently deletes a chama: the team itself, its membership list and
// pending invites, its loan account and every loan request/guarantee/
// repayment on it, its pooled investments, its Last Respect fund and
// claims, and every withdrawal request/approval tied to it. The team
// leader's and members' L-CHAMA *accounts* are left untouched — only
// their attachment to this chama is removed, so they're simply free to
// create or join a different one afterward.
//
// Uploaded report history (MemberReport/SavingsEntry rows synced from
// Google Sheets) and past Payment records are unlinked from the team
// rather than deleted outright, since those are financial/audit records
// an admin may still need after the chama itself is gone.
//
// This cannot be undone, so the confirmation burden (typing the chama's
// name) lives on the client — this action itself just requires the
// permission and that the organisation still exists.
export async function deleteOrganisation(teamId: string) {
  await requirePermission('canManageOrganisations');

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { members: { select: { userId: true } } },
  });
  if (!team) throw new Error('Organisation not found.');

  const { name: teamName, ownerId } = team;
  const memberUserIds = team.members.map((m) => m.userId);

  try {
    await prisma.$transaction([
      // Children of LoanRequest, then LoanRequest itself.
      prisma.loanGuarantee.deleteMany({ where: { loanRequest: { teamId } } }),
      prisma.loanRepayment.deleteMany({ where: { loanRequest: { teamId } } }),
      prisma.loanRequest.deleteMany({ where: { teamId } }),

      // Children of WithdrawalRequest, then WithdrawalRequest itself.
      prisma.withdrawalApproval.deleteMany({ where: { withdrawalRequest: { teamId } } }),
      prisma.withdrawalRequest.deleteMany({ where: { teamId } }),

      // Everything else that belongs exclusively to this team.
      prisma.teamMembership.deleteMany({ where: { teamId } }),
      prisma.teamInvite.deleteMany({ where: { teamId } }),
      prisma.teamInvestment.deleteMany({ where: { teamId } }),
      prisma.lastRespectClaim.deleteMany({ where: { teamId } }),
      prisma.lastRespectFund.deleteMany({ where: { teamId } }),
      prisma.loanAccount.deleteMany({ where: { teamId } }),

      // Unlink (don't delete) historical records worth keeping.
      prisma.memberReport.updateMany({ where: { teamId }, data: { teamId: null } }),
      prisma.savingsEntry.updateMany({ where: { teamId }, data: { teamId: null } }),
      prisma.payment.updateMany({ where: { teamId }, data: { teamId: null } }),

      prisma.team.delete({ where: { id: teamId } }),
    ]);
  } catch (err) {
    throw friendlyAccountError(err);
  }

  // Best-effort — the chama is already gone at this point either way.
  await notifyUser(
    ownerId,
    'Chama deleted',
    `${teamName} has been permanently removed by an L-CHAMA admin. You're free to create or join a different chama.`
  ).catch(() => {});
  for (const userId of memberUserIds) {
    await notifyUser(
      userId,
      'Chama deleted',
      `${teamName}, which you were a member of, has been permanently removed by an L-CHAMA admin. You're free to create or join a different chama.`
    ).catch(() => {});
  }

  revalidatePath('/admin');
  return { success: true };
}

export async function verifyCampaign(campaignId: string) {
  await requirePermission('canManageCampaigns');

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
  await requirePermission('canManageCampaigns');

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
  type: 'MMF' | 'STOCK' | 'BOND' | 'FIXED_DEPOSIT' | 'SAVINGS' | 'JUNIOR';
  description?: string;
  roi: number;
  roiMax?: number | null;
  duration: number;
  minAmount: number;
  maxAmount?: number | null;
}) {
  await requirePermission('canManageProducts');

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
    type: 'MMF' | 'STOCK' | 'BOND' | 'FIXED_DEPOSIT' | 'SAVINGS' | 'JUNIOR';
    description?: string;
    roi: number;
    roiMax?: number | null;
    duration: number;
    minAmount: number;
    maxAmount?: number | null;
  }
) {
  await requirePermission('canManageProducts');

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
  await requirePermission('canManageProducts');

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

// Hard delete — only allowed once nothing actually references the
// product anymore (a chama's TeamInvestment, or a member's personal
// MemberAccount). Both relations are left as the Prisma default
// (Restrict), so a delete against a referenced product would otherwise
// fail with a raw foreign-key error; we check first and give a clear,
// actionable message instead — "close it out" for an active investment,
// or "deactivate" as the alternative that hides it from /invest without
// touching history.
export async function deleteInvestmentProduct(productId: string) {
  await requirePermission('canManageProducts');

  const product = await prisma.investmentProduct.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found.');

  const [investmentCount, memberAccountCount] = await Promise.all([
    prisma.teamInvestment.count({ where: { productId } }),
    prisma.memberAccount.count({ where: { productId } }),
  ]);

  if (investmentCount > 0 || memberAccountCount > 0) {
    const parts: string[] = [];
    if (investmentCount > 0) parts.push(`${investmentCount} chama investment${investmentCount === 1 ? '' : 's'}`);
    if (memberAccountCount > 0) parts.push(`${memberAccountCount} member account${memberAccountCount === 1 ? '' : 's'}`);
    throw new Error(
      `Can't delete "${product.name}" — it still has ${parts.join(' and ')} attached. Deactivate it instead to hide it from /invest without losing that history.`
    );
  }

  await prisma.investmentProduct.delete({ where: { id: productId } });

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
  await requirePermission('canManageMemberReports');

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
  await requirePermission('canManageMemberReports');
  await prisma.memberReport.delete({ where: { id: reportId } });
  revalidatePath('/admin');
  revalidatePath('/reports');
  return { success: true };
}

// ─────────────────────────────────────────────
// Savings Account — a second, running-balance product alongside
// Investments. Entries are fed from a dedicated "Savings Data" tab in
// the same workbook (pasted here as CSV, or pushed automatically via
// /api/savings/sync from an Apps Script trigger — same column names,
// sent as JSON under "records"), and can be reviewed, corrected, or
// added by hand from the admin Savings screen.
// ─────────────────────────────────────────────

function parseSavingsCsv(csvText: string) {
  const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error('CSV needs a header row plus at least one data row.');

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);

  const emailIdx = col('memberemail') !== -1 ? col('memberemail') : col('email');
  if (emailIdx === -1) throw new Error('CSV header must include a "memberEmail" column.');

  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    const get = (name: string) => {
      const idx = col(name);
      return idx === -1 ? undefined : cells[idx] || undefined;
    };
    return {
      memberEmail: cells[emailIdx]?.toLowerCase(),
      memberName: get('membername') || get('name'),
      accountNo: get('accountno') || get('account'),
      date: get('date'),
      openingBalance: get('openingbalance'),
      deposit: get('deposit'),
      payout: get('payout') || get('withdrawal'),
      closingBalance: get('closingbalance') || get('closing_balance') || get('closingbal'),
      periodLabel: get('periodlabel') || get('period'),
      notes: get('notes'),
    };
  });
}

async function matchSavingsRowsToTeams(rows: { memberEmail?: string }[]) {
  const emails = [...new Set(rows.map((r) => r.memberEmail).filter(Boolean))] as string[];
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

  return (email: string) => {
    const user = userByEmail.get(email);
    return user ? teamIdByOwnerId.get(user.id) || teamIdByUserId.get(user.id) || null : null;
  };
}

export async function syncSavingsCsv(csvText: string) {
  await requirePermission('canManageSavings');

  const rows = parseSavingsCsv(csvText).filter((r) => r.memberEmail);
  if (rows.length === 0) throw new Error('No valid rows found in that CSV.');

  const teamIdFor = await matchSavingsRowsToTeams(rows);
  let matched = 0;

  await prisma.$transaction(
    rows.map((row) => {
      const teamId = teamIdFor(row.memberEmail!);
      if (teamId) matched += 1;
      return prisma.savingsEntry.create({
        data: { ...row, memberEmail: row.memberEmail!, teamId },
      });
    })
  );

  revalidatePath('/admin');
  revalidatePath('/reports');
  revalidatePath('/savings');
  return { success: true, imported: rows.length, matched };
}

export type SavingsEntryInput = {
  memberEmail: string;
  memberName?: string;
  accountNo?: string;
  date?: string;
  openingBalance?: string;
  deposit?: string;
  payout?: string;
  closingBalance?: string;
  periodLabel?: string;
  notes?: string;
};

export async function createSavingsEntry(input: SavingsEntryInput) {
  await requirePermission('canManageSavings');

  const memberEmail = input.memberEmail.toLowerCase().trim();
  if (!memberEmail) throw new Error('A member email is required.');

  const teamIdFor = await matchSavingsRowsToTeams([{ memberEmail }]);

  await prisma.savingsEntry.create({
    data: { ...input, memberEmail, teamId: teamIdFor(memberEmail) },
  });

  revalidatePath('/admin');
  revalidatePath('/reports');
  revalidatePath('/savings');
  return { success: true };
}

export async function updateSavingsEntry(entryId: string, input: SavingsEntryInput) {
  await requirePermission('canManageSavings');

  const memberEmail = input.memberEmail.toLowerCase().trim();
  if (!memberEmail) throw new Error('A member email is required.');

  const teamIdFor = await matchSavingsRowsToTeams([{ memberEmail }]);

  await prisma.savingsEntry.update({
    where: { id: entryId },
    data: { ...input, memberEmail, teamId: teamIdFor(memberEmail) },
  });

  revalidatePath('/admin');
  revalidatePath('/reports');
  revalidatePath('/savings');
  return { success: true };
}

export async function deleteSavingsEntry(entryId: string) {
  await requirePermission('canManageSavings');
  await prisma.savingsEntry.delete({ where: { id: entryId } });
  revalidatePath('/admin');
  revalidatePath('/reports');
  revalidatePath('/savings');
  return { success: true };
}

// ─────────────────────────────────────────────
// Payments — M-Pesa / Visa card requests logged from a member's
// /accounts page. These are now resolved automatically by Paystack's
// webhook (see src/app/api/payments/paystack/webhook/route.ts and
// src/lib/payment-resolution.ts) as soon as the STK push/card checkout
// completes. This manual resolver stays as an admin fallback for a
// payment that's stuck PENDING (e.g. a missed webhook) — SUCCESS
// credits the member's MemberAccount balance the same way, FAILED/
// CANCELLED just record the outcome.
// ─────────────────────────────────────────────

export async function resolvePayment(paymentId: string, status: 'SUCCESS' | 'FAILED' | 'CANCELLED', note?: string) {
  await requirePermission('canManagePayments');

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { memberAccount: { include: { product: true } }, team: true, user: true },
  });
  if (!payment) throw new Error('Payment not found.');
  if (payment.status !== 'PENDING') throw new Error('This payment has already been resolved.');

  // A payment credits either a personal MemberAccount (/accounts) or a
  // chama's shared LoanAccount (/deposit) — see prisma/schema.prisma.
  const target = payment.memberAccount ? payment.memberAccount.product.name : payment.team ? `${payment.team.name}'s loan account` : 'your account';

  if (status === 'SUCCESS') {
    if (payment.memberAccountId) {
      await prisma.$transaction([
        prisma.payment.update({ where: { id: paymentId }, data: { status, note: note?.trim() || undefined } }),
        prisma.memberAccount.update({
          where: { id: payment.memberAccountId },
          data: { balance: { increment: payment.amount } },
        }),
      ]);
    } else if (payment.teamId) {
      await prisma.$transaction([
        prisma.payment.update({ where: { id: paymentId }, data: { status, note: note?.trim() || undefined } }),
        prisma.loanAccount.upsert({
          where: { teamId: payment.teamId },
          create: { teamId: payment.teamId, balance: Math.max(0, payment.amount) },
          update: { balance: { increment: payment.amount } },
        }),
      ]);
      await syncChamaToLudeva(payment.teamId);
    } else {
      await prisma.payment.update({ where: { id: paymentId }, data: { status, note: note?.trim() || undefined } });
    }
    await notifyUser(
      payment.userId,
      'Payment confirmed',
      `Your KES ${payment.amount.toLocaleString()} payment to ${target} was confirmed and credited.`
    );
  } else {
    await prisma.payment.update({ where: { id: paymentId }, data: { status, note: note?.trim() || undefined } });
    await notifyUser(
      payment.userId,
      'Payment not completed',
      `Your KES ${payment.amount.toLocaleString()} payment to ${target} could not be confirmed.${note ? ` ${note}` : ''}`
    );
  }

  revalidatePath('/admin');
  revalidatePath('/accounts');
  revalidatePath('/deposit');
  return { success: true };
}

// ─────────────────────────────────────────────
// Ludeva Junior Account applications — a guardian's KYC submission for
// a child's account. Approving opens (or reuses) a MemberAccount
// against the active JUNIOR product so the guardian can then fund it
// from /accounts.
// ─────────────────────────────────────────────

export async function decideJuniorApplication(
  applicationId: string,
  decision: 'APPROVED' | 'REJECTED',
  note?: string
) {
  await requirePermission('canManageJuniorAccounts');

  const application = await prisma.juniorAccountApplication.findUnique({ where: { id: applicationId } });
  if (!application) throw new Error('Application not found.');
  if (application.status !== 'PENDING_REVIEW') throw new Error('This application has already been decided.');

  await prisma.juniorAccountApplication.update({
    where: { id: applicationId },
    data: {
      status: decision,
      reviewNotes: note?.trim() || undefined,
      reviewedAt: new Date(),
    },
  });

  if (decision === 'APPROVED') {
    const juniorProduct = await prisma.investmentProduct.findFirst({ where: { type: 'JUNIOR', isActive: true } });
    if (juniorProduct) {
      await prisma.memberAccount.upsert({
        where: { userId_productId: { userId: application.guardianId, productId: juniorProduct.id } },
        update: {},
        create: { userId: application.guardianId, productId: juniorProduct.id },
      });
    }
  }

  await notifyUser(
    application.guardianId,
    decision === 'APPROVED' ? 'Junior Account approved' : 'Junior Account application not approved',
    decision === 'APPROVED'
      ? `The Ludeva Junior Account for ${application.childFullName} has been approved. You can now fund it from your Accounts page.`
      : `The Junior Account application for ${application.childFullName} was not approved.${note ? ` Reason: ${note}` : ''}`
  );

  revalidatePath('/admin');
  revalidatePath('/accounts');
  return { success: true };
}

// Confirm or reject a member's self-claimed Ludeva Plc membership
// number (submitted at onboarding or from /profile). Only a VERIFIED
// status gets the toll-free withdrawal — see src/lib/withdrawal-fee.ts.
export async function decideLudevaMembership(userId: string, decision: 'VERIFIED' | 'REJECTED', reason?: string) {
  await requirePermission('canManageLudevaMembers');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('Member not found.');
  if (user.ludevaMembershipStatus !== 'PENDING') {
    throw new Error('This membership claim has already been decided.');
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      ludevaMembershipStatus: decision,
      ludevaMembershipDecidedAt: new Date(),
      ludevaMembershipRejectionReason: decision === 'REJECTED' ? reason?.trim() || undefined : null,
    },
  });

  await notifyUser(
    userId,
    decision === 'VERIFIED' ? 'Ludeva membership confirmed' : 'Ludeva membership not confirmed',
    decision === 'VERIFIED'
      ? `Your Ludeva Plc membership number (${user.ludevaMemberNumber}) was confirmed. You now withdraw toll free.`
      : `We could not confirm the Ludeva Plc membership number you provided.${reason ? ` ${reason}` : ''} You'll pay the standard 5% withdrawal fee — contact lchama@ludevaplc.co.ke if you believe this is a mistake.`
  );

  revalidatePath('/admin');
  return { success: true };
}
