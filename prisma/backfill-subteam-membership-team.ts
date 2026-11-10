// One-off: fills SubTeamMembership.teamId (added for multi-chama support)
// on rows created before the column existed.
//
//   npx tsx prisma/backfill-subteam-membership-team.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.subTeamMembership.findMany({
    where: { teamId: null },
    include: { subTeam: { select: { teamId: true } } },
  });
  for (const r of rows) {
    await prisma.subTeamMembership.update({ where: { id: r.id }, data: { teamId: r.subTeam.teamId } });
  }
  console.log(`Backfilled ${rows.length} sub-chama membership(s).`);
}

main().finally(() => prisma.$disconnect());
