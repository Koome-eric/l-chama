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

export function savingsRowKey(r: SavingsRow) {
  return [identityOf(r), norm(r.accountNo) ?? '', norm(r.date) ?? '', norm(r.periodLabel) ?? ''].join('|');
}

// Arbitrary constant — serialises concurrent savings syncs so two requests
// racing each other can't both see "no existing row" and both insert.
const SAVINGS_SYNC_LOCK = 727_001;

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
