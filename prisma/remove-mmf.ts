// ONE-OFF, run BEFORE `prisma db push` on any database that still has the
// old MMF fund type. Postgres can't drop an enum value that rows still use,
// so existing MMF products are moved to FIXED_DEPOSIT first (they stay
// inactive, so they can't be invested in; TeamInvestment / MemberAccount
// rows pointing at them are untouched) and renamed so no "MMF" label
// survives anywhere. Safe to re-run.
//
//   npx tsx prisma/remove-mmf.ts && npx prisma db push
//
// Raw SQL on purpose: the generated client no longer knows about 'MMF'.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const moved = await prisma.$executeRawUnsafe(
    `UPDATE "investmentproduct"
        SET "type" = 'FIXED_DEPOSIT', "name" = 'Legacy investment', "isActive" = false
      WHERE "type"::text = 'MMF'`
  );
  console.log(`✅ Reclassified ${moved} MMF product(s) to FIXED_DEPOSIT / "Legacy investment" (inactive).`);
}

main()
  .catch((err) => {
    console.error('❌ remove-mmf failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
