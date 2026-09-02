import { requirePanelAccess } from '@/lib/require-panel-access';
import { TeamMembersSection } from '@/components/panel/TeamMembersSection';

export default async function TeamPage() {
  const { user, ctx } = await requirePanelAccess('/team');

  const data = {
    id: ctx.team.id,
    name: ctx.team.name,
    isOwner: ctx.isOwner,
    permissions: ctx.permissions,
    owner: {
      id: ctx.team.owner.id,
      fullName: ctx.team.owner.fullName,
      email: ctx.team.owner.email ?? 'Unknown email',
    },
    members: ctx.team.members.map((m: (typeof ctx.team.members)[number]) => ({
      membershipId: m.id,
      userId: m.userId,
      fullName: m.user.fullName,
      email: m.user.email ?? 'Unknown email',
      canInvite: m.canInvite,
      canManagePermissions: m.canManagePermissions,
      canRemoveMembers: m.canRemoveMembers,
      canApproveLoans: m.canApproveLoans,
      canInvestPooled: m.canInvestPooled,
      canViewPooledFunds: m.canViewPooledFunds,
      canManageReports: m.canManageReports,
      canWithdraw: m.canWithdraw,
    })),
    invites: ctx.team.invites.map((i: (typeof ctx.team.invites)[number]) => ({
      id: i.id,
      email: i.email,
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
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Team Members</h1>
        <p className="text-muted-foreground">Everyone in {data.name}, and who owns the chama.</p>
      </div>
      <TeamMembersSection team={data} currentUserId={user.id} />
    </div>
  );
}
