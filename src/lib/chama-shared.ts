// Pure constants/helpers shared by server code AND client components.
// Keep server-only imports (prisma, next/headers) out of this file — see
// src/lib/chama.ts for the server-side context helpers, which re-export
// everything here.

export const ACTIVE_CHAMA_COOKIE = "lchama_active_team";

// Ludeva Numbers (issued to a member when they register on the Ludeva
// platform) are compared upper-case with no spaces: "lb 0048" == "LB0048".
export function normaliseLudevaNumber(value: string | null | undefined): string | null {
  const v = (value ?? "").replace(/\s+/g, "").toUpperCase();
  return v || null;
}

// How a chama is identified wherever people have to tell two apart: its name
// plus the Ludeva Number of its Admin (pass the owner's ludevaMemberNumber).
export function chamaLabel(team: { name: string; ludevaNumber?: string | null }): string {
  return team.ludevaNumber ? `${team.name} (${team.ludevaNumber})` : team.name;
}

export type ChamaPermissions = {
  canInvite: boolean;
  canManagePermissions: boolean;
  canRemoveMembers: boolean;
  canApproveLoans: boolean;
  canInvestPooled: boolean;
  canViewPooledFunds: boolean;
  canManageReports: boolean;
  canWithdraw: boolean;
  canManageSubTeams: boolean;
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
  canManageSubTeams: true,
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
  canManageSubTeams: false,
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
  canManageSubTeams: "Create sub-chamas, assign leaders, move members between them",
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
    canManageSubTeams: !!source.canManageSubTeams,
  };
}

