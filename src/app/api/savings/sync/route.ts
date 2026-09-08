import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Webhook for a Google Sheets Apps Script to push Savings Data rows
// straight in — same idea as the Investments/MemberReport pipeline
// (/api/member-reports/sync), run against L Chama's own SavingsEntry
// table instead. Protect it with a shared secret (set
// SAVINGS_SYNC_SECRET in the environment and have the Apps Script send
// it as `x-sync-secret`).
//
// Expected JSON body:
// {
//   "records": [
//     { "memberEmail": "member@example.com", "memberName": "Jane Doe",
//       "accountNo": "SAV-0012", "date": "2026-08-01",
//       "openingBalance": "50000", "deposit": "5000", "withdrawal": "0",
//       "monthlyRate": "0.7%", "interestEarned": "385",
//       "closingBalance": "55385", "periodLabel": "Aug 2026", "notes": "" }
//   ]
// }
export async function POST(req: NextRequest) {
  const secret = process.env.SAVINGS_SYNC_SECRET;
  if (secret && req.headers.get('x-sync-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const rows = Array.isArray(body?.records) ? body.records : null;
  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'Body must include a non-empty "records" array.' }, { status: 400 });
  }

  const cleaned = rows
    .map((r: any) => ({
      memberEmail: typeof r.memberEmail === 'string' ? r.memberEmail.toLowerCase().trim() : null,
      memberName: r.memberName ?? null,
      accountNo: r.accountNo != null ? String(r.accountNo) : null,
      date: r.date != null ? String(r.date) : null,
      openingBalance: r.openingBalance != null ? String(r.openingBalance) : null,
      deposit: r.deposit != null ? String(r.deposit) : null,
      withdrawal: r.withdrawal != null ? String(r.withdrawal) : null,
      monthlyRate: r.monthlyRate != null ? String(r.monthlyRate) : null,
      interestEarned: r.interestEarned != null ? String(r.interestEarned) : null,
      closingBalance: r.closingBalance != null ? String(r.closingBalance) : null,
      periodLabel: r.periodLabel != null ? String(r.periodLabel) : null,
      notes: r.notes != null ? String(r.notes) : null,
    }))
    .filter((r: any) => r.memberEmail);

  if (cleaned.length === 0) {
    return NextResponse.json({ error: 'No row had a valid "memberEmail".' }, { status: 400 });
  }

  const emails = [...new Set(cleaned.map((r: any) => r.memberEmail as string))] as string[];
  const users = await prisma.user.findMany({ where: { email: { in: emails } } });
  const userByEmail = new Map(
    users
      .filter((u): u is typeof u & { email: string } => !!u.email)
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
      return prisma.savingsEntry.create({ data: { ...row, teamId } });
    })
  );

  return NextResponse.json({ success: true, imported: cleaned.length });
}
