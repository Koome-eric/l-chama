import { requirePanelAccess } from '@/lib/require-panel-access';
import { TeamMembersSection } from '@/components/panel/TeamMembersSection';
import type { User } from '@prisma/client';

// Team-facing pages never receive anyone's ID/passport number. What other
// chama members DO see is each person's phone number and Ludeva number
// (flagged when the number is not yet admin-VERIFIED); full ID details
// stay on the admin dashboard.
const ludevaNumberOf = (u: User) => u.ludevaMemberNumber?.trim() || null;
const ludevaVerifiedOf = (u: User) => u.ludevaMembershipStatus === 'VERIFIED';

export default async function TeamPage() {
  const { user, ctx } = await requirePanelAccess('/team');

  const data = {
    id: ctx.team.id,
    name: ctx.team.name,
    signatoryUserIds: [ctx.team.secretaryId, ctx.team.treasurerId].filter((x): x is string => !!x),
    isOwner: ctx.isOwner,
    permissions: ctx.permissions,
    owner: {
      id: ctx.team.owner.id,
      fullName: ctx.team.owner.fullName,
      email: ctx.team.owner.email ?? 'Unknown email',
      phone: ctx.team.owner.phone ?? null,
      ludevaNumber: ludevaNumberOf(ctx.team.owner),
      ludevaVerified: ludevaVerifiedOf(ctx.team.owner),
    },
    members: ctx.team.members.map((m: (typeof ctx.team.members)[number]) => ({
      membershipId: m.id,
      userId: m.userId,
      fullName: m.user.fullName,
      email: m.user.email ?? 'Unknown email',
      phone: m.user.phone ?? null,
      ludevaNumber: ludevaNumberOf(m.user),
      ludevaVerified: ludevaVerifiedOf(m.user),
      canInvite: m.canInvite,
      canManagePermissions: m.canManagePermissions,
      canRemoveMembers: m.canRemoveMembers,
      canApproveLoans: m.canApproveLoans,
      canInvestPooled: m.canInvestPooled,
      canViewPooledFunds: m.canViewPooledFunds,
      canManageReports: m.canManageReports,
      canWithdraw: m.canWithdraw,
      canManageSubTeams: m.canManageSubTeams,
    })),
    invites: ctx.team.invites.map((i: (typeof ctx.team.invites)[number]) => ({
      id: i.id,
      email: i.email,
      token: i.token,
      status: i.status,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
      canInvite: i.canInvite,
      canManagePermissions: i.canManagePermissions,
      canRemoveMembers: i.canRemoveMembers,
      canApproveLoans: i.canApproveLoans,
      canInvestPooled: i.canInvestPooled,
      canViewPooledFunds: i.canViewPooledFunds,
      canManageReports: i.canManageReports,
      canWithdraw: i.canWithdraw,
      canManageSubTeams: i.canManageSubTeams,
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Team Members</h1>
        <p className="text-muted-foreground">Everyone in {data.name}{data.owner.ludevaNumber ? ` (Admin Ludeva No. ${data.owner.ludevaNumber})` : ''}, and who owns the chama.</p>
      </div>
      <TeamMembersSection team={data} currentUserId={user.id} />
    </div>
  );
}
