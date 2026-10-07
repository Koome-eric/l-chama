import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// One-off migration for the "Team Leader leads every sub-chama" rule.
//
// Before: each sub-chama had its own member as leader.
// After:  the chama owner (the Team Leader who created the account) leads
//         every sub-chama. The member who used to lead one is NOT dropped —
//         they become an ordinary member of that same sub-chama.
//
// DRY RUN by default — prints what it would change and writes nothing:
//   npx tsx prisma/reassign-subchama-leaders.ts
// Then apply for real:
//   npx tsx prisma/reassign-subchama-leaders.ts --apply
const apply = process.argv.includes('--apply');

async function main() {
  const subTeams = await prisma.subTeam.findMany({ include: { team: true, leader: true } });
  let changed = 0;

  for (const st of subTeams) {
    if (st.leaderId === st.team.ownerId) continue;

    // SubTeamMembership.userId is unique platform-wide, so only add the old
    // leader as a member if they aren't already sitting in a sub-chama.
    const existing = await prisma.subTeamMembership.findUnique({ where: { userId: st.leaderId } });
    const keepAsMember = !existing;

    console.log(
      `${st.team.name} › ${st.name}: leader ${st.leader.fullName || st.leader.email} → team owner` +
        (keepAsMember ? ' (old leader kept as member)' : ' (old leader already in a sub-chama, not re-added)')
    );

    if (apply) {
      await prisma.$transaction([
        ...(keepAsMember ? [prisma.subTeamMembership.create({ data: { subTeamId: st.id, userId: st.leaderId } })] : []),
        prisma.subTeam.update({ where: { id: st.id }, data: { leaderId: st.team.ownerId } }),
      ]);
    }
    changed++;
  }

  console.log(`\n${changed} sub-chama(s) ${apply ? 'updated' : 'would be updated (dry run — pass --apply)'}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
