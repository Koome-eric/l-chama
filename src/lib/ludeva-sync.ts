import { prisma } from '@/lib/prisma';

// Pushes a snapshot of a chama to Ludeva's ExternalChama mirror (see
// Ludeva's /api/lchama/webhook) so admins over there — and Ludeva's
// public /about/teams page — can see real L Chama activity instead of
// static marketing copy. Best-effort and non-blocking: L Chama's own
// database is always the source of truth, so a failed sync here should
// never break the action that triggered it (approving an org, adding a
// member, funding the pool, etc).
export async function syncChamaToLudeva(teamId: string) {
  const url = process.env.LUDEVA_SYNC_URL;
  if (!url) return; // not configured — skip silently, this is optional glue between the two apps

  try {
    const [team, memberCount, loanAccount] = await Promise.all([
      prisma.team.findUnique({ where: { id: teamId }, include: { owner: true } }),
      prisma.teamMembership.count({ where: { teamId } }),
      prisma.loanAccount.findUnique({ where: { teamId } }),
    ]);
    if (!team) return;

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.LCHAMA_SYNC_SECRET ? { 'x-sync-secret': process.env.LCHAMA_SYNC_SECRET } : {}),
      },
      body: JSON.stringify({
        externalId: team.id,
        name: team.name,
        levelName: team.levelName,
        monthlyAmount: team.monthlyAmount,
        memberCount: memberCount + 1, // +1 for the owner
        poolBalance: loanAccount?.balance ?? 0,
        ownerName: team.owner.fullName || team.owner.email,
        ownerEmail: team.owner.email,
        approvalStatus: team.approvalStatus,
      }),
      // Don't let a slow/unreachable Ludeva hang the caller's request.
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.error('⚠️ Failed to sync chama to Ludeva:', err);
  }
}
