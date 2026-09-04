import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Seeds the default "Links your chama to Ludeva MMF" product so /invest
// isn't empty on a fresh install. Run with `npx prisma db seed` (wired
// up in package.json's `prisma.seed` field) or `npx tsx prisma/seed.ts`.
async function main() {
  await prisma.investmentProduct.upsert({
    where: { id: 'ludeva-mmf-default' },
    update: {},
    create: {
      id: 'ludeva-mmf-default',
      name: 'Ludeva Money Market Fund',
      type: 'MMF',
      description:
        "Your chama's pooled fund invested directly into Ludeva's flagship Money Market Fund — the same MMF Ludeva's individual members use.",
      roi: 9,
      roiMax: 13,
      duration: 1,
      minAmount: 1000,
      maxAmount: null,
      isActive: true,
    },
  });

  console.log('✅ Seeded Ludeva Money Market Fund product.');

  // ── Personal Ludeva accounts (member dashboard → /accounts) ──
  // Fixed ids so re-running this is always safe (upsert), and so the
  // ProductType (STOCK/SAVINGS/JUNIOR) → account mapping used by
  // /accounts stays stable even if an admin renames one later.
  await prisma.investmentProduct.upsert({
    where: { id: 'ludeva-shares-account' },
    update: { name: 'Shares Account', type: 'STOCK', roi: 9, roiMax: 13 },
    create: {
      id: 'ludeva-shares-account',
      name: 'Shares Account',
      type: 'STOCK',
      description:
        'Buy shares in Ludeva and earn a dividend on your holding — the same shares product Ludeva members invest in individually.',
      roi: 9,
      roiMax: 13,
      duration: 12,
      minAmount: 1000,
      maxAmount: null,
      isActive: true,
    },
  });

  await prisma.investmentProduct.upsert({
    where: { id: 'ludeva-savings-account' },
    update: { name: 'Savings Account', type: 'SAVINGS', roi: 7, roiMax: null },
    create: {
      id: 'ludeva-savings-account',
      name: 'Savings Account',
      type: 'SAVINGS',
      description: 'A flexible savings account earning up to 7% p.a. — top up any time via M-Pesa or card.',
      roi: 7,
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

  console.log('✅ Seeded Shares, Savings, and Ludeva Junior accounts.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
