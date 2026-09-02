import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

// ─────────────────────────────────────────────
// L Chama Team Panel — context & permission helpers.
// The Team Leader ("Admin") always has full access. Everyone else's
// access is controlled by the permission flags on their TeamMembership,
// set by the owner (or by another member with canManagePermissions)
// either at invite time or afterward from the Members tab.
// ─────────────────────────────────────────────

export type ChamaPermissions = {
  canInvite: boolean;
  canManagePermissions: boolean;
  canRemoveMembers: boolean;
  canApproveLoans: boolean;
  canInvestPooled: boolean;
  canViewPooledFunds: boolean;
  canManageReports: boolean;
  canWithdraw: boolean;
};

export const OWNER_PERMISSIONS: ChamaPermissions = {
  canInvite: true,
  canManagePermissions: true,
  canRemoveMembers: true,
  canApproveLoans: true,
  canInvestPooled: true,
  canViewPooledFunds: true,
  canManageReports: true,
  canWithdraw: true,
};

// Sensible defaults for a newly invited member if the invite form
// doesn't override a flag — can view the pool, can't move money or
// manage anyone.
export const DEFAULT_INVITE_PERMISSIONS: ChamaPermissions = {
  canInvite: false,
  canManagePermissions: false,
  canRemoveMembers: false,
  canApproveLoans: false,
  canInvestPooled: false,
  canViewPooledFunds: true,
  canManageReports: false,
  canWithdraw: false,
};

export const PERMISSION_LABELS: Record<keyof ChamaPermissions, string> = {
  canInvite: "Invite new members",
  canManagePermissions: "Manage other members' roles",
  canRemoveMembers: "Remove members from the chama",
  canApproveLoans: "Approve/reject loan requests & repayments",
  canInvestPooled: "Invest pooled funds into a product",
  canViewPooledFunds: "View the loan account & investment balances",
  canManageReports: "Sync/upload Google Sheets performance reports",
  canWithdraw: "Close an investment back to the pooled fund",
};

export function permissionsFrom(source: Record<string, any>): ChamaPermissions {
  return {
    canInvite: !!source.canInvite,
    canManagePermissions: !!source.canManagePermissions,
    canRemoveMembers: !!source.canRemoveMembers,
    canApproveLoans: !!source.canApproveLoans,
    canInvestPooled: !!source.canInvestPooled,
    canViewPooledFunds: !!source.canViewPooledFunds,
    canManageReports: !!source.canManageReports,
    canWithdraw: !!source.canWithdraw,
  };
}

export type ChamaContext = {
  team: {
    id: string;
    name: string;
    ownerId: string;
    owner: User;
    levelKey: string | null;
    levelName: string | null;
    monthlyAmount: number | null;
    groupSize: number | null;
    approvalStatus: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
    rejectionReason: string | null;
    isDiaspora: boolean;
    objectives: string[];
    membersRunningSME: number | null;
    membersEmployed: number | null;
    hasLastRespectCover: boolean;
    lastRespectContribution: number | null;
    members: Array<{ id: string; userId: string; user: User } & ChamaPermissions>;
    invites: Array<
      { id: string; email: string; status: string; expiresAt: Date; createdAt: Date } & ChamaPermissions
    >;
  };
  isOwner: boolean;
  membershipId: string | null;
  permissions: ChamaPermissions;
};

export async function getChamaContext(user: User): Promise<ChamaContext | null> {
  const ownedTeam = await prisma.team.findUnique({
    where: { ownerId: user.id },
    include: {
      owner: true,
      members: { include: { user: true } },
      invites: { where: { status: "PENDING" } },
    },
  });

  if (ownedTeam) {
    return {
      team: ownedTeam as any,
      isOwner: true,
      membershipId: null,
      permissions: OWNER_PERMISSIONS,
    };
  }

  const membership = await prisma.teamMembership.findUnique({
    where: { userId: user.id },
    include: {
      team: {
        include: {
          owner: true,
          members: { include: { user: true } },
          invites: { where: { status: "PENDING" } },
        },
      },
    },
  });

  if (!membership) return null;

  return {
    team: membership.team as any,
    isOwner: false,
    membershipId: membership.id,
    permissions: permissionsFrom(membership),
  };
}

export function hasPermission(ctx: ChamaContext, key: keyof ChamaPermissions): boolean {
  return ctx.isOwner || !!ctx.permissions[key];
}

export function allMemberUserIds(ctx: ChamaContext): string[] {
  return [ctx.team.ownerId, ...ctx.team.members.map((m) => m.userId)];
}
