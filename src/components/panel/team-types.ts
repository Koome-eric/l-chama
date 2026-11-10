import type { ChamaPermissions } from '@/lib/chama-shared';

export type TeamMember = { membershipId: string; userId: string; fullName: string | null; email: string; phone: string | null; ludevaNumber: string | null; ludevaVerified: boolean } & ChamaPermissions;
export type TeamInvite = { id: string; email: string; status: string; expiresAt: string; createdAt: string; token: string } & ChamaPermissions;

export type TeamMembersData = {
  id: string;
  name: string;
  // User ids holding the Secretary/Treasurer signatory role — they can't be
  // appointed Admin until someone else takes the role.
  signatoryUserIds: string[];
  isOwner: boolean;
  permissions: ChamaPermissions;
  owner: { id: string; fullName: string | null; email: string; phone: string | null; ludevaNumber: string | null; ludevaVerified: boolean };
  members: TeamMember[];
  invites: TeamInvite[];
};
