import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  CONTRIBUTION_DEADLINE_DAY,
  REMINDER_DAYS_BEFORE,
  currentMonthKey,
  monthLabel,
  nextContributionDeadline,
  nairobiToday,
  payoutLine,
} from '@/lib/payouts';

// Daily cron (see vercel.json). Sends in-app notifications to every
// member of every APPROVED chama:
//   - contribution deadline reminders 5 days before, 1 day before and on
//     the 25th (see REMINDER_DAYS_BEFORE);
//   - on the 1st of the month, "payout due this month" to the whole chama
//     when a payout is scheduled.
// Protected by CRON_SECRET — Vercel Cron sends it as a Bearer token.
// Safe to run more than once a day: a notification with the same title
// is never created twice for the same user on the same Nairobi date.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const today = nairobiToday(now);
  const deadline = nextContributionDeadline(now);
  const sendDeadline = REMINDER_DAYS_BEFORE.includes(deadline.daysLeft);
  const sendPayout = today.d === 1;
  if (!sendDeadline && !sendPayout) return NextResponse.json({ ok: true, sent: 0 });

  const dayKey = `${today.y}-${today.m}-${today.d}`;
  const teams = await prisma.team.findMany({
    where: { approvalStatus: 'APPROVED' },
    include: { members: { select: { userId: true } } },
  });

  const monthKey = currentMonthKey(now);
  const slots = sendPayout
    ? await prisma.payoutSchedule.findMany({ where: { payoutMonth: monthKey }, include: { user: true } })
    : [];

  // Everything already sent today, to keep the job idempotent.
  const startOfDay = new Date(Date.UTC(today.y, today.m - 1, today.d) - 3 * 3_600_000); // 00:00 EAT
  const already = await prisma.notification.findMany({
    where: { createdAt: { gte: startOfDay }, title: { in: ['Contribution deadline', 'Payout due this month'] } },
    select: { userId: true, title: true },
  });
  const seen = new Set(already.map((n) => `${n.userId}|${n.title}`));

  const rows: { userId: string; title: string; message: string }[] = [];
  for (const team of teams) {
    const userIds = [team.ownerId, ...team.members.map((m) => m.userId)];

    if (sendDeadline) {
      const message =
        deadline.daysLeft === 0
          ? `Today is the deadline (${CONTRIBUTION_DEADLINE_DAY}th) for ${team.name}'s monthly contribution.`
          : `${team.name}'s monthly contribution is due by ${deadline.dueLabel} — ${deadline.daysLeft} day${deadline.daysLeft === 1 ? '' : 's'} left.`;
      for (const userId of userIds) {
        if (!seen.has(`${userId}|Contribution deadline`)) rows.push({ userId, title: 'Contribution deadline', message });
      }
    }

    const slot = slots.find((s) => s.teamId === team.id);
    if (slot) {
      const message = payoutLine(slot.payoutMonth, slot.user.ludevaMemberNumber, slot.user.fullName || slot.user.email || 'Member');
      for (const userId of userIds) {
        if (!seen.has(`${userId}|Payout due this month`)) rows.push({ userId, title: 'Payout due this month', message });
      }
    }
  }

  if (rows.length) await prisma.notification.createMany({ data: rows });
  return NextResponse.json({ ok: true, sent: rows.length, day: dayKey, month: monthLabel(monthKey) });
}
