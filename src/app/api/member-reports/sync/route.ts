import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Webhook for a Google Sheets Apps Script to push member performance rows
// straight in — the same idea as Ludeva's Sheets-to-database pipeline,
// run locally against L Chama's own MemberReport table. Protect it with
// a shared secret (set MEMBER_REPORTS_SYNC_SECRET in the environment and
// have the Apps Script send it as `x-sync-secret`).
//
// Expected JSON body:
// {
//   "rows": [
//     { "email": "member@example.com", "name": "Jane Doe", "date": "2026-08-01",
//       "principal": "50000", "rate": "9.5%", "roi": "1250", "withdrawal": "0",
//       "closingBalance": "51250", "period": "Aug 2026", "notes": "" }
//   ]
// }
export async function POST(req: NextRequest) {
  const secret = process.env.MEMBER_REPORTS_SYNC_SECRET;
  if (secret && req.headers.get('x-sync-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const rows = Array.isArray(body?.rows) ? body.rows : null;
  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'Body must include a non-empty "rows" array.' }, { status: 400 });
  }

  const cleaned = rows
    .map((r: any) => ({
      memberEmail: typeof r.email === 'string' ? r.email.toLowerCase().trim() : null,
      memberName: r.name ?? null,
      date: r.date != null ? String(r.date) : null,
      principal: r.principal != null ? String(r.principal) : null,
      rate: r.rate != null ? String(r.rate) : null,
      roi: r.roi != null ? String(r.roi) : null,
      withdrawal: r.withdrawal != null ? String(r.withdrawal) : null,
      closingBal: r.closingBalance != null ? String(r.closingBalance) : null,
      periodLabel: r.period != null ? String(r.period) : null,
      notes: r.notes != null ? String(r.notes) : null,
    }))
    .filter((r: any) => r.memberEmail);

  if (cleaned.length === 0) {
    return NextResponse.json({ error: 'No row had a valid "email".' }, { status: 400 });
  }

  const emails: string[] = Array.from(
    new Set(
      cleaned
        .map((r: { memberEmail: string | null }) => r.memberEmail)
        .filter((email: string | null): email is string => typeof email === 'string')
    )
  );
  const users = await prisma.user.findMany({ where: { email: { in: emails } } });
  const userByEmail = new Map(
    users
      .filter((u): u is typeof u & { email: string } => typeof u.email === 'string')
      .map((u) => [u.email.toLowerCase(), u])
  );

  const memberships = await prisma.teamMembership.findMany({
    where: { userId: { in: users.map((u) => u.id) } },
  });
  const teamIdByUserId = new Map(memberships.map((m) => [m.userId, m.teamId]));

  const owners = await prisma.team.findMany({ where: { ownerId: { in: users.map((u) => u.id) } } });
  const teamIdByOwnerId = new Map(owners.map((t) => [t.ownerId, t.id]));

  await prisma.$transaction(
    cleaned.map((row: any) => {
      const user = userByEmail.get(row.memberEmail);
      const teamId = user ? teamIdByOwnerId.get(user.id) || teamIdByUserId.get(user.id) || null : null;
      return prisma.memberReport.create({ data: { ...row, teamId } });
    })
  );

  return NextResponse.json({ success: true, imported: cleaned.length });
}
