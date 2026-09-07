import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Idempotent: safe to re-run.
//
// 1. Updates "Shares Account": minimum deposit → KES 200,000, rate → a
//    flat 12% p.a. (replacing the previous 9–13% range).
// 2. Deactivates (isActive: false) the retired products: Ludeva MMF,
//    Fixed Deposit, and Ludeva Bonds. Deactivating rather than deleting
//    keeps any existing team's historical TeamInvestment / member's
//    MemberAccount records intact — the product just stops accepting
//    new money and drops off /accounts and /invest.
//
// Run with: npx tsx prisma/update-products.ts
async function main() {
  // ── 1. Shares Account ──
  const shares = await prisma.investmentProduct.findFirst({
    where: { name: 'Shares Account' },
  });
  if (shares) {
    await prisma.investmentProduct.update({
      where: { id: shares.id },
      data: { minAmount: 200000, roi: 12, roiMax: null },
    });
    console.log('✅ "Shares Account" updated → min KES 200,000, rate 12% p.a.');
  } else {
    console.warn(
      '⚠️  No product named "Shares Account" found — nothing updated. Run `npx prisma db seed` first if it hasn\'t been created yet.'
    );
  }

  // ── 2. Retire Ludeva MMF, Fixed Deposit, Ludeva Bonds ──
  const toRetire = await prisma.investmentProduct.findMany({
    where: {
      isActive: true,
      OR: [
        { type: 'MMF' },
        { type: 'FIXED_DEPOSIT' },
        { type: 'BOND' },
        { name: { contains: 'MMF', mode: 'insensitive' } },
        { name: { contains: 'Money Market', mode: 'insensitive' } },
        { name: { contains: 'Fixed Deposit', mode: 'insensitive' } },
        { name: { contains: 'Bond', mode: 'insensitive' } },
      ],
    },
  });

  if (toRetire.length === 0) {
    console.log('↷ No active MMF / Fixed Deposit / Bond products found — nothing to retire.');
  } else {
    for (const p of toRetire) {
      await prisma.investmentProduct.update({
        where: { id: p.id },
        data: { isActive: false },
      });
      console.log(`✅ Deactivated "${p.name}" (${p.type})`);
    }
  }
}

main()
  .catch((err) => {
    console.error('❌ Script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
