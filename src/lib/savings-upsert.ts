import { prisma } from '@/lib/prisma';

// ─────────────────────────────────────────────
// Idempotent savings-entry writer — shared by the Apps Script webhook
// (/api/savings/sync) and the admin CSV paste (syncSavingsCsv).
//
// Before this, every pushed row was blindly INSERTed, so any re-push of the
// same sheet row (a trigger that timed out before marking the row "Pushed",
// two overlapping hourly triggers, a "Failed" row retried after the server
// had actually saved it, a CSV pasted twice) created a duplicate entry.
//
// An entry is now identified by:
//   member (email, else phone) + account no. + date + period label
// A row that matches an existing entry UPDATES it (so corrections in the
// sheet flow through); otherwise it is created. Re-sending the same data any
// number of times leaves exactly one entry.
// ─────────────────────────────────────────────

export type SavingsRow = {
  memberEmail: string | null;
  memberPhone: string | null;
  memberName: string | null;
  accountNo: string | null;
  date: string | null;
  openingBalance: string | null;
  deposit: string | null;
  payout: string | null;
  closingBalance: string | null;
  periodLabel: string | null;
  notes: string | null;
  teamId: string | null;
};

const norm = (v: string | null | undefined) => (v == null ? null : v.trim() || null);

function identityOf(r: Pick<SavingsRow, 'memberEmail' | 'memberPhone'>) {
  return r.memberEmail ? `e:${r.memberEmail.toLowerCase()}` : r.memberPhone ? `p:${r.memberPhone.replace(/\D/g, '').slice(-9)}` : '';
}

export function savingsRowKey(
  r: Pick<SavingsRow, 'memberEmail' | 'memberPhone' | 'accountNo' | 'date' | 'periodLabel'>
) {
  return [identityOf(r), norm(r.accountNo) ?? '', norm(r.date) ?? '', norm(r.periodLabel) ?? ''].join('|');
}

// Arbitrary constant — serialises concurrent savings syncs so two requests
// racing each other can't both see "no existing row" and both insert.
export const SAVINGS_SYNC_LOCK = 727_001;

export async function upsertSavingsEntries(rows: SavingsRow[]) {
  // 1. Collapse duplicates inside the batch itself (last one wins).
  const byKey = new Map<string, SavingsRow>();
  for (const r of rows) byKey.set(savingsRowKey(r), r);
  const unique = [...byKey.values()];

  let created = 0;
  let updated = 0;

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SAVINGS_SYNC_LOCK})`;

      for (const row of unique) {
        const accountNo = norm(row.accountNo);
        const date = norm(row.date);
        const periodLabel = norm(row.periodLabel);

        const existing = await tx.savingsEntry.findFirst({
          where: {
            ...(row.memberEmail ? { memberEmail: row.memberEmail } : { memberEmail: '', memberPhone: row.memberPhone }),
            accountNo,
            date,
            periodLabel,
          },
          orderBy: { uploadedAt: 'asc' },
        });

        // memberEmail is a required column; a phone-only member is stored
        // with an empty email and matched by phone (see the lookup above).
        const data = { ...row, memberEmail: row.memberEmail ?? '' };
        if (existing) {
          await tx.savingsEntry.update({ where: { id: existing.id }, data });
          updated += 1;
        } else {
          await tx.savingsEntry.create({ data });
          created += 1;
        }
      }
    },
    { timeout: 60_000, maxWait: 15_000 }
  );

  return { created, updated };
}

// ─────────────────────────────────────────────
// Duplicate detection — same identity key the sync uses above, so "duplicate"
// means exactly "the sync would have treated these as one entry".
// Entries with no email AND no phone are never grouped (nothing reliable to
// match them on). Within a group the most recently updated entry is the one
// to keep (it carries the latest data); the rest are the duplicates.
// ─────────────────────────────────────────────
type DupCandidate = {
  id: string;
  memberEmail: string;
  memberPhone: string | null;
  memberName: string | null;
  accountNo: string | null;
  date: string | null;
  openingBalance: string | null;
  deposit: string | null;
  payout: string | null;
  closingBalance: string | null;
  periodLabel: string | null;
  notes: string | null;
  updatedAt: Date;
  uploadedAt: Date;
};

export type DupMatch = 'name' | 'identity';
export type DupKeep = 'oldest' | 'newest';
export type DupOptions = { match?: DupMatch; keep?: DupKeep };

// "name"     → same member name (case/spacing/punctuation-insensitive) + account no. + date + period
// "identity" → same email (else phone) + account no. + date + period (what the sync itself uses)
// Either way the account/date/period part keeps a member's entries for DIFFERENT
// periods apart — only true repeats of the same entry are grouped.
const normName = (v: string | null | undefined) =>
  (v ?? '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

export function groupSavingsDuplicates<T extends DupCandidate>(
  entries: T[],
  { match = 'identity', keep = 'newest' }: DupOptions = {}
): { key: string; entries: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const e of entries) {
    let key: string;
    if (match === 'name') {
      const n = normName(e.memberName);
      if (!n) continue; // no name to match on
      key = ['n:' + n, norm(e.accountNo) ?? '', norm(e.date) ?? '', norm(e.periodLabel) ?? ''].join('|');
    } else {
      key = savingsRowKey({ ...e, memberEmail: e.memberEmail || null });
      if (key.startsWith('|')) continue; // no email/phone identity
    }
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const out: { key: string; entries: T[] }[] = [];
  for (const [key, list] of groups) {
    if (list.length < 2) continue;
    list.sort((a, b) =>
      keep === 'oldest'
        ? a.uploadedAt.getTime() - b.uploadedAt.getTime() || a.id.localeCompare(b.id)
        : b.updatedAt.getTime() - a.updatedAt.getTime() || b.uploadedAt.getTime() - a.uploadedAt.getTime()
    );
    out.push({ key, entries: list }); // entries[0] is the keeper
  }
  return out;
}
