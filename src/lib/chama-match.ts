import { prisma } from '@/lib/prisma';
import { normaliseLudevaNumber } from '@/lib/chama-shared';

// ─────────────────────────────────────────────
// Which chama does a synced sheet row (savings / member report) belong to?
//
// The rows only carry a member's email or phone, and one person can now be in
// several chamas, so "their chama" is no longer a single answer. A row can say
// which chama it is for by carrying the chama's name and/or its Admin's
// Ludeva Number (the two chama identifiers):
//
//   1. Ludeva Number given  → the member's chama whose ADMIN has that Ludeva Number.
//   2. else name given      → the member's chama with that name (case-insensitive,
//                             only if exactly one matches).
//   3. else, no identifier  → their chama if they have exactly one.
//
// Anything ambiguous or unmatched resolves to null (shown as "Unmatched" in the
// admin screens, where it can be re-matched) rather than guessing — filing a
// member's money under the wrong chama is worse than leaving it unlinked.
// ─────────────────────────────────────────────

export type ChamaHint = { chamaName?: string | null; ludevaNumber?: string | null };

type TeamRef = { id: string; name: string; ludevaNumber: string | null };

export async function buildTeamResolver(userIds: string[]) {
  const teamsByUser = new Map<string, TeamRef[]>();
  const add = (userId: string, team: TeamRef) => {
    const list = teamsByUser.get(userId) ?? [];
    if (!list.some((t) => t.id === team.id)) list.push(team);
    teamsByUser.set(userId, list);
  };

  if (userIds.length > 0) {
    const [owned, memberships] = await Promise.all([
      prisma.team.findMany({
        where: { ownerId: { in: userIds } },
        select: { id: true, name: true, ownerId: true, owner: { select: { ludevaMemberNumber: true } } },
      }),
      prisma.teamMembership.findMany({
        where: { userId: { in: userIds } },
        select: {
          userId: true,
          team: { select: { id: true, name: true, owner: { select: { ludevaMemberNumber: true } } } },
        },
      }),
    ]);
    owned.forEach((t) => add(t.ownerId, { id: t.id, name: t.name, ludevaNumber: normaliseLudevaNumber(t.owner.ludevaMemberNumber) }));
    memberships.forEach((m) =>
      add(m.userId, { id: m.team.id, name: m.team.name, ludevaNumber: normaliseLudevaNumber(m.team.owner.ludevaMemberNumber) })
    );
  }

  return (userId: string | undefined, hint?: ChamaHint): string | null => {
    if (!userId) return null;
    const teams = teamsByUser.get(userId) ?? [];
    if (teams.length === 0) return null;

    const number = normaliseLudevaNumber(hint?.ludevaNumber);
    if (number) return teams.find((t) => t.ludevaNumber === number)?.id ?? null;

    const name = hint?.chamaName?.trim().toLowerCase();
    if (name) {
      const byName = teams.filter((t) => t.name.trim().toLowerCase() === name);
      return byName.length === 1 ? byName[0].id : null;
    }

    return teams.length === 1 ? teams[0].id : null;
  };
}
