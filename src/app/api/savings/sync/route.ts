import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { phoneLookupVariants } from '@/lib/phone';

// Webhook for a Google Sheets Apps Script to push Savings Data rows
// straight in — same idea as the Investments/MemberReport pipeline
// (/api/member-reports/sync), run against L Chama's own SavingsEntry
// table instead. Protect it with a shared secret (set
// SAVINGS_SYNC_SECRET in the environment and have the Apps Script send
// it as `x-sync-secret`).
//
// No interest fields here — L-Chama savings carry no interest (that's a
// Ludeva Investment Account feature), so this is a plain running
// balance: opening + deposit - payout = closing.
//
// A row is matched to an account by memberEmail first; if that doesn't
// resolve to a user (e.g. the member signed up by phone only), memberPhone
// is used as a fallback identifier — see src/lib/phone.ts for why phone
// matching needs a few candidate forms rather than one exact value.
//
// Expected JSON body:
// {
//   "records": [
//     { "memberEmail": "member@example.com", "memberPhone": "0712345678",
//       "memberName": "Jane Doe", "accountNo": "SAV-0012", "date": "2026-08-01",
//       "openingBalance": "50000", "deposit": "5000", "payout": "0",
//       "closingBalance": "55000", "periodLabel": "Aug 2026", "notes": "" }
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
      memberPhone: r.memberPhone != null && String(r.memberPhone).trim() ? String(r.memberPhone).trim() : null,
      memberName: r.memberName ?? null,
      accountNo: r.accountNo != null ? String(r.accountNo) : null,
      date: r.date != null ? String(r.date) : null,
      openingBalance: r.openingBalance != null ? String(r.openingBalance) : null,
      deposit: r.deposit != null ? String(r.deposit) : null,
      payout: r.payout != null ? String(r.payout) : null,
      closingBalance: r.closingBalance != null ? String(r.closingBalance) : null,
      periodLabel: r.periodLabel != null ? String(r.periodLabel) : null,
      notes: r.notes != null ? String(r.notes) : null,
    }))
    // memberEmail used to be required; a row now only needs *an* identifier,
    // so a phone-only sign-up with no email on file can still be synced.
    .filter((r: any) => r.memberEmail || r.memberPhone);

  if (cleaned.length === 0) {
    return NextResponse.json({ error: 'No row had a valid "memberEmail" or "memberPhone".' }, { status: 400 });
  }

  const emails = [...new Set(cleaned.map((r: any) => r.memberEmail).filter(Boolean))] as string[];
  const phoneVariantsByRow = new Map<number, string[]>();
  const allPhoneVariants = new Set<string>();
  cleaned.forEach((row: any, i: number) => {
    if (!row.memberPhone) return;
    const variants = phoneLookupVariants(row.memberPhone);
    phoneVariantsByRow.set(i, variants);
    variants.forEach((v) => allPhoneVariants.add(v));
  });

  const users = await prisma.user.findMany({
    where: {
      OR: [
        ...(emails.length ? [{ email: { in: emails } }] : []),
        ...(allPhoneVariants.size ? [{ phone: { in: [...allPhoneVariants] } }] : []),
      ],
    },
  });
  const userByEmail = new Map(
    users
      .filter((u): u is typeof u & { email: string } => !!u.email)
      .map((u) => [u.email.toLowerCase(), u])
  );
  const userByPhone = new Map(
    users.filter((u): u is typeof u & { phone: string } => !!u.phone).map((u) => [u.phone, u])
  );

  const memberships = await prisma.teamMembership.findMany({
    where: { userId: { in: users.map((u) => u.id) } },
  });
  const teamIdByUserId = new Map(memberships.map((m) => [m.userId, m.teamId]));

  const owners = await prisma.team.findMany({ where: { ownerId: { in: users.map((u) => u.id) } } });
  const teamIdByOwnerId = new Map(owners.map((t) => [t.ownerId, t.id]));

  await prisma.$transaction(
    cleaned.map((row: any, i: number) => {
      const byEmail = row.memberEmail ? userByEmail.get(row.memberEmail) : undefined;
      const byPhone = byEmail
        ? undefined
        : (phoneVariantsByRow.get(i) || []).map((v) => userByPhone.get(v)).find(Boolean);
      const user = byEmail || byPhone;
      const teamId = user ? teamIdByOwnerId.get(user.id) || teamIdByUserId.get(user.id) || null : null;
      return prisma.savingsEntry.create({ data: { ...row, teamId } });
    })
  );

  return NextResponse.json({ success: true, imported: cleaned.length });
}
