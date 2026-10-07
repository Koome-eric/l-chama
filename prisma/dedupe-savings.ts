import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// One-off cleanup for the duplicate SavingsEntry rows created before
// /api/savings/sync became idempotent. Rows are duplicates when they share
// member (email, else phone) + account no. + date + period label — the same
// key the sync now uses. The most recently uploaded row in each group is
// kept (it carries the latest data); the rest are deleted.
//
// DRY RUN by default — prints what it would delete and changes nothing:
//   npx tsx prisma/dedupe-savings.ts
// Then delete for real:
//   npx tsx prisma/dedupe-savings.ts --apply
const apply = process.argv.includes('--apply');

const norm = (v: string | null) => (v == null ? '' : v.trim());
const identity = (e: { memberEmail: string; memberPhone: string | null }) =>
  e.memberEmail ? `e:${e.memberEmail.toLowerCase()}` : e.memberPhone ? `p:${e.memberPhone.replace(/\D/g, '').slice(-9)}` : '';

async function main() {
  const entries = await prisma.savingsEntry.findMany({ orderBy: { uploadedAt: 'desc' } });
  const groups = new Map<string, typeof entries>();
  for (const e of entries) {
    const key = [identity(e), norm(e.accountNo), norm(e.date), norm(e.periodLabel)].join('|');
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  const toDelete: string[] = [];
  for (const [key, list] of groups) {
    if (list.length < 2) continue;
    const [keep, ...extras] = list; // newest first
    toDelete.push(...extras.map((x) => x.id));
    console.log(`${key}  → keeping ${keep.id}, removing ${extras.length}`);
  }

  console.log(`\n${entries.length} entries total, ${toDelete.length} duplicate(s) found.`);
  if (!apply) {
    console.log('Dry run — nothing deleted. Re-run with --apply to delete them.');
    return;
  }
  const res = await prisma.savingsEntry.deleteMany({ where: { id: { in: toDelete } } });
  console.log(`Deleted ${res.count} duplicate entries.`);
}

main().finally(() => prisma.$disconnect());
