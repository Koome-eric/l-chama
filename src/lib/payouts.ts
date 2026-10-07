// ─────────────────────────────────────────────
// Payout rotation + contribution-deadline helpers.
//
// Two rules live here:
//   1. Contributions are due by the 25th of every month.
//   2. Each month one member's payout is due (see PayoutSchedule in the
//      Prisma schema). The Dashboard shows that member's Ludeva Number
//      and name to the whole chama.
//
// All date maths is done in Nairobi time (EAT, UTC+3, no DST) so the
// "25th" means the 25th in Kenya no matter where the server or the
// viewing member (e.g. diaspora) happens to be.
// ─────────────────────────────────────────────

export const CONTRIBUTION_DEADLINE_DAY = 25;
export const APP_TIME_ZONE = 'Africa/Nairobi';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

export type YMD = { y: number; m: number; d: number }; // m is 1-12

export function nairobiToday(now: Date = new Date()): YMD {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get('year'), m: get('month'), d: get('day') };
}

const utcDay = ({ y, m, d }: YMD) => Date.UTC(y, m - 1, d) / 86_400_000;

/** "YYYY-MM" key for the month `now` falls in (Nairobi time). */
export function currentMonthKey(now: Date = new Date()): string {
  const { y, m } = nairobiToday(now);
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function isValidMonthKey(key: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(key);
}

/** "2026-09" -> "Sept 2026" */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_SHORT[m - 1]} ${y}`;
}

/** The Dashboard notice line, e.g. "Payout. Sept 2026, LB0048; Linda Atieno" */
export function payoutLine(monthKey: string, ludevaNumber: string | null | undefined, name: string): string {
  const who = ludevaNumber?.trim() ? `${ludevaNumber.trim()}; ${name}` : name;
  return `Payout. ${monthLabel(monthKey)}, ${who}`;
}

export type DeadlineInfo = {
  /** ISO date (YYYY-MM-DD) of the next contribution deadline */
  dueDate: string;
  /** e.g. "25 Sept 2026" */
  dueLabel: string;
  /** whole days from today (Nairobi) until the deadline; 0 = today */
  daysLeft: number;
  status: 'today' | 'soon' | 'upcoming';
};

/** Next monthly contribution deadline (the 25th) relative to `now`. */
export function nextContributionDeadline(now: Date = new Date()): DeadlineInfo {
  const today = nairobiToday(now);
  let { y, m } = today;
  if (today.d > CONTRIBUTION_DEADLINE_DAY) {
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  const due: YMD = { y, m, d: CONTRIBUTION_DEADLINE_DAY };
  const daysLeft = utcDay(due) - utcDay(today);
  return {
    dueDate: `${y}-${String(m).padStart(2, '0')}-${String(due.d).padStart(2, '0')}`,
    dueLabel: `${due.d} ${MONTH_SHORT[m - 1]} ${y}`,
    daysLeft,
    status: daysLeft === 0 ? 'today' : daysLeft <= 5 ? 'soon' : 'upcoming',
  };
}

/** Days before the deadline on which members get a reminder notification. */
export const REMINDER_DAYS_BEFORE = [5, 1, 0];
