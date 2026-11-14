import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Idempotently aligns the active catalog with the published product rates.
// Retired products are deactivated, not deleted, so historical investments
// remain linked to their original product records.
//
// Run with: npx tsx prisma/update-products.ts
async function main() {
  const shares = await prisma.investmentProduct.findFirst({
    where: { id: 'ludeva-shares-account' },
  });
  if (shares) {
    await prisma.investmentProduct.update({
      where: { id: shares.id },
      data: {
        name: 'Shares Account',
        type: 'STOCK',
        description: 'Invest in shares through your chama, with annual returns above 13%.',
        roi: 13,
        roiMax: null,
        isActive: true,
      },
    });
    console.log('✅ "Shares Account" updated → above 13% p.a.');
  } else {
    console.warn(
      '⚠️  No "Shares Account" product found — run `npx prisma db seed` first.'
    );
  }

  const savings = await prisma.investmentProduct.findFirst({
    where: { id: 'ludeva-savings-account' },
  });
  if (savings) {
    await prisma.investmentProduct.update({
      where: { id: savings.id },
      data: {
        name: 'Savings Account',
        type: 'SAVINGS',
        description: 'A flexible savings account earning 5% p.a.',
        roi: 5,
        roiMax: null,
        isActive: true,
      },
    });
    console.log('✅ "Savings Account" updated → 5% p.a.');
  } else {
    console.warn(
      '⚠️  No "Savings Account" product found — run `npx prisma db seed` first.'
    );
  }

  const junior = await prisma.investmentProduct.findFirst({
    where: { id: 'ludeva-junior-account' },
  });
  if (junior) {
    await prisma.investmentProduct.update({
      where: { id: junior.id },
      data: {
        description:
          "A savings account opened by a parent/guardian on behalf of a child, earning up to 5% p.a. Requires the child's birth certificate and passport photo, plus the guardian's ID/passport, phone number, and KRA PIN — reviewed by an admin before the account is opened.",
        roi: 5,
        roiMax: null,
      },
    });
    console.log('✅ "Junior Account" updated → 5% p.a.');
  } else {
    console.warn('⚠️  No "Junior Account" product found — run `npx prisma db seed` first.');
  }

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
  console.log('✅ "Fixed Income Account" updated → 13% p.a.');

  const retired = await prisma.investmentProduct.updateMany({
    where: {
      isActive: true,
      OR: [
        { type: 'FIXED_DEPOSIT' },
        { type: 'BOND', id: { not: 'ludeva-fixed-income-account' } },
        { name: { contains: 'Fixed Deposit', mode: 'insensitive' } },
      ],
    },
    data: { isActive: false },
  });
  console.log(`✅ Deactivated ${retired.count} retired investment product(s).`);
}

main()
  .catch((err) => {
    console.error('❌ Product catalog update failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
