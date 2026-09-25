import { requirePanelAccess } from '@/lib/require-panel-access';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/chama';
import { SubChamasSection } from '@/components/panel/SubChamasSection';

export default async function SubChamasPage() {
  const { user, ctx } = await requirePanelAccess('/sub-chamas');

  const subTeams = await prisma.subTeam.findMany({
    where: { teamId: ctx.team.id },
    include: { leader: true, members: { include: { user: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const assignedUserIds = new Set(subTeams.flatMap((st) => [st.leaderId, ...st.members.map((m) => m.userId)]));
  const unassigned = ctx.team.members.filter((m) => !assignedUserIds.has(m.userId));

  const data = {
    teamName: ctx.team.name,
    isOwner: ctx.isOwner,
    canManage: hasPermission(ctx, 'canManageSubTeams'),
    currentUserId: user.id,
    allMembers: ctx.team.members.map((m) => ({
      membershipId: m.id,
      userId: m.userId,
      fullName: m.user.fullName,
      email: m.user.email ?? 'Unknown email',
    })),
    subTeams: subTeams.map((st) => ({
      id: st.id,
      name: st.name,
      isMine: st.leaderId === user.id,
      leader: {
        userId: st.leaderId,
        fullName: st.leader.fullName,
        email: st.leader.email ?? 'Unknown email',
      },
      members: st.members.map((m) => ({
        subTeamMembershipId: m.id,
        userId: m.userId,
        fullName: m.user.fullName,
        email: m.user.email ?? 'Unknown email',
      })),
    })),
    unassigned: unassigned.map((m) => ({
      membershipId: m.id,
      userId: m.userId,
      fullName: m.user.fullName,
      email: m.user.email ?? 'Unknown email',
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Sub-Chamas</h1>
        <p className="text-muted-foreground">
          Split {data.teamName} into smaller groups, each with its own leader — everyone stays a full
          member of {data.teamName} and its shared loan account throughout.
        </p>
      </div>
      <SubChamasSection data={data} />
    </div>
  );
}
