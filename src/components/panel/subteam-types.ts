export type SubChamaMemberOption = {
  membershipId: string;
  userId: string;
  fullName: string | null;
  email: string;
};

export type SubTeamMemberRow = {
  subTeamMembershipId: string;
  userId: string;
  fullName: string | null;
  email: string;
};

export type SubTeamRow = {
  id: string;
  name: string;
  isMine: boolean;
  leader: { userId: string; fullName: string | null; email: string };
  members: SubTeamMemberRow[];
};

export type SubChamasData = {
  teamName: string;
  isOwner: boolean;
  canManage: boolean;
  currentUserId: string;
  allMembers: SubChamaMemberOption[];
  subTeams: SubTeamRow[];
  unassigned: SubChamaMemberOption[];
};
