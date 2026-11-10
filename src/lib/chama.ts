import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";
import {
  ACTIVE_CHAMA_COOKIE,
  OWNER_PERMISSIONS,
  permissionsFrom,
  type ChamaPermissions,
} from "@/lib/chama-shared";

export {
  ACTIVE_CHAMA_COOKIE,
  normaliseLudevaNumber,
  chamaLabel,
  OWNER_PERMISSIONS,
  DEFAULT_INVITE_PERMISSIONS,
  PERMISSION_LABELS,
  permissionsFrom,
  type ChamaPermissions,
} from "@/lib/chama-shared";


// ─────────────────────────────────────────────
// L Chama Team Panel — context & permission helpers.
// The Team Leader ("Admin") always has full access. Everyone else's
// access is controlled by the permission flags on their TeamMembership,
// set by the owner (or by another member with canManagePermissions)
// either at invite time or afterward from the Members tab.
//
// A person can own and/or belong to SEVERAL chamas with one account. The
// dashboard always shows one of them — the "active chama", remembered in
// the ACTIVE_CHAMA_COOKIE cookie and changed from the sidebar switcher
// (see setActiveChama in src/app/(dashboard)/active-chama-actions.ts).
// Every caller still just does getChamaContext(user) and gets the active
// one, so nothing downstream needs to know there are several.
// ─────────────────────────────────────────────

export type ChamaContext = {
  team: {
    id: string;
    name: string;
    photoUrl: string | null;
    isLudevaMember: boolean;
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
      { id: string; email: string; token: string; status: string; expiresAt: Date; createdAt: Date } & ChamaPermissions
    >;
    // ── Withdrawal signatories — see src/lib/withdrawals.ts. The owner is
    // the implicit Admin signatory; these two are owner-assigned from the
    // member list. ──
    secretaryId: string | null;
    secretary: User | null;
    treasurerId: string | null;
    treasurer: User | null;
  };
  isOwner: boolean;
  membershipId: string | null;
  permissions: ChamaPermissions;
};

const TEAM_INCLUDE = {
  owner: true,
  secretary: true,
  treasurer: true,
  members: { include: { user: true } },
  invites: { where: { status: "PENDING" as const } },
};

export type ChamaSummary = {
  id: string;
  name: string;
  // The Ludeva Number of the chama's Admin — with the name, the chama's identifier.
  ludevaNumber: string | null;
  isOwner: boolean;
  approvalStatus: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
};

// Every chama this person owns or belongs to — owned first, then by date
// joined. Light query (no members/invites), used by the switcher and to
// validate a chosen chama.
export async function listUserChamas(user: Pick<User, "id">): Promise<ChamaSummary[]> {
  const select = {
    id: true,
    name: true,
    approvalStatus: true,
    owner: { select: { ludevaMemberNumber: true } },
  } as const;
  const [owned, memberships] = await Promise.all([
    prisma.team.findMany({ where: { ownerId: user.id }, select, orderBy: { createdAt: "asc" } }),
    prisma.teamMembership.findMany({
      where: { userId: user.id },
      select: { team: { select } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const toSummary = (
    t: { id: string; name: string; approvalStatus: ChamaSummary["approvalStatus"]; owner: { ludevaMemberNumber: string | null } },
    isOwner: boolean
  ): ChamaSummary => ({
    id: t.id,
    name: t.name,
    ludevaNumber: t.owner.ludevaMemberNumber,
    approvalStatus: t.approvalStatus,
    isOwner,
  });

  return [...owned.map((t) => toSummary(t, true)), ...memberships.map((m) => toSummary(m.team, false))];
}

// Remember which chama the person is working in. Only callable from a
// Server Action or Route Handler (cookies are read-only while rendering).
export async function setActiveChamaCookie(teamId: string) {
  (await cookies()).set(ACTIVE_CHAMA_COOKIE, teamId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}

async function readActiveTeamId(): Promise<string | null> {
  try {
    return (await cookies()).get(ACTIVE_CHAMA_COOKIE)?.value ?? null;
  } catch {
    // Called outside a request (script, cron) — no cookie to read.
    return null;
  }
}

// The chama the person is currently working in. `teamId` forces a
// specific one (must be one they own/belong to); otherwise the active-chama
// cookie is used, falling back to the first approved chama so a pending or
// rejected registration never locks someone out of a chama they're in.
export async function getChamaContext(user: User, teamId?: string | null): Promise<ChamaContext | null> {
  const chamas = await listUserChamas(user);
  if (chamas.length === 0) return null;

  const wanted = teamId ?? (await readActiveTeamId());
  const chosen =
    (wanted ? chamas.find((c) => c.id === wanted) : undefined) ??
    chamas.find((c) => c.approvalStatus === "APPROVED") ??
    chamas[0];

  const team = await prisma.team.findUnique({ where: { id: chosen.id }, include: TEAM_INCLUDE });
  if (!team) return null;

  if (chosen.isOwner) {
    return {
      team: team as any,
      isOwner: true,
      membershipId: null,
      permissions: OWNER_PERMISSIONS,
    };
  }

  const membership = team.members.find((m) => m.userId === user.id);
  if (!membership) return null;

  return {
    team: team as any,
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
