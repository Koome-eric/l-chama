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
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
