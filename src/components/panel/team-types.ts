import type { ChamaPermissions } from '@/lib/chama';

export type TeamMember = { membershipId: string; userId: string; fullName: string | null; email: string; ludevaNumber: string | null } & ChamaPermissions;
export type TeamInvite = { id: string; email: string; status: string; expiresAt: string; createdAt: string; token: string } & ChamaPermissions;

export type TeamMembersData = {
  id: string;
  name: string;
  isOwner: boolean;
  permissions: ChamaPermissions;
  owner: { id: string; fullName: string | null; email: string; ludevaNumber: string | null };
  members: TeamMember[];
  invites: TeamInvite[];
};
