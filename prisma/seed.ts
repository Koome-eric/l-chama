import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Seeds the default fixed-income product so /invest isn't empty on a fresh install.
// Run with `npx prisma db seed` (wired
// up in package.json's `prisma.seed` field) or `npx tsx prisma/seed.ts`.
async function main() {
  await prisma.investmentProduct.upsert({
    where: { id: 'ludeva-fixed-income-account' },
    update: {
      name: 'Fixed Income Account',
      type: 'BOND',
      description: 'Fixed-income investments for your chama, earning 13% p.a.',
      roi: 13,
      roiMax: null,
      duration: 12,
      isActive: true,
    },
    create: {
      id: 'ludeva-fixed-income-account',
      name: 'Fixed Income Account',
      type: 'BOND',
      description: 'Fixed-income investments for your chama, earning 13% p.a.',
      roi: 13,
      roiMax: null,
      duration: 12,
      minAmount: 1000,
      maxAmount: null,
      isActive: true,
    },
  });

  console.log('✅ Seeded Fixed Income Account.');

  // ── Personal Ludeva accounts (member dashboard → /accounts) ──
  // Fixed ids so re-running this is always safe (upsert), and so the
  // ProductType (STOCK/SAVINGS/JUNIOR) → account mapping used by
  // /accounts stays stable even if an admin renames one later.
  await prisma.investmentProduct.upsert({
    where: { id: 'ludeva-shares-account' },
    update: {
      name: 'Shares Account',
      type: 'STOCK',
      description: 'Invest in shares through your chama, with annual returns above 9%.',
      roi: 9,
      roiMax: null,
      isActive: true,
    },
    create: {
      id: 'ludeva-shares-account',
      name: 'Shares Account',
      type: 'STOCK',
      description: 'Invest in shares through your chama, with annual returns above 9%.',
      roi: 9,
      roiMax: null,
      duration: 12,
      minAmount: 1000,
      maxAmount: null,
      isActive: true,
    },
  });

  await prisma.investmentProduct.upsert({
    where: { id: 'ludeva-savings-account' },
    update: {
      name: 'Savings Account',
      type: 'SAVINGS',
      description: 'A flexible savings account earning 5% p.a. — top up any time via M-Pesa or card.',
      roi: 5,
      roiMax: null,
      isActive: true,
    },
    create: {
      id: 'ludeva-savings-account',
      name: 'Savings Account',
      type: 'SAVINGS',
      description: 'A flexible savings account earning 5% p.a. — top up any time via M-Pesa or card.',
      roi: 5,
      roiMax: null,
      duration: 1,
      minAmount: 500,
      maxAmount: null,
      isActive: true,
    },
  });

  await prisma.investmentProduct.upsert({
    where: { id: 'ludeva-junior-account' },
    update: { name: 'Ludeva Junior Account', type: 'JUNIOR', roi: 6, roiMax: null },
    create: {
      id: 'ludeva-junior-account',
      name: 'Ludeva Junior Account',
      type: 'JUNIOR',
      description:
        "A savings account opened by a parent/guardian on behalf of a child, earning up to 6% p.a. Requires the child's birth certificate and passport photo, plus the guardian's ID/passport, phone number, and KRA PIN — reviewed by an admin before the account is opened.",
      roi: 6,
      roiMax: null,
      duration: 12,
      minAmount: 500,
      maxAmount: null,
      isActive: true,
    },
  });

  await prisma.investmentProduct.updateMany({
    where: { type: 'MMF', isActive: true },
    data: { isActive: false },
  });

  console.log('✅ Seeded Shares, Savings, Fixed Income, and Ludeva Junior accounts.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
