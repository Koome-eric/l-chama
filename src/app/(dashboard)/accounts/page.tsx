import { prisma } from '@/lib/prisma';
import { requirePanelAccess } from '@/lib/require-panel-access';
import { AccountsClient } from './AccountsClient';

const PERSONAL_TYPES = ['STOCK', 'SAVINGS', 'JUNIOR'] as const;
type PersonalProductType = (typeof PERSONAL_TYPES)[number];

export default async function AccountsPage() {
  const { user } = await requirePanelAccess('/accounts');

  const [products, memberAccounts, payments, juniorApplications] = await Promise.all([
    prisma.investmentProduct.findMany({
      where: { isActive: true, type: { in: [...PERSONAL_TYPES] } },
      orderBy: { roi: 'desc' },
    }),
    prisma.memberAccount.findMany({
      where: { userId: user.id },
      include: { product: true },
    }),
    prisma.payment.findMany({
      where: { userId: user.id },
      include: { memberAccount: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.juniorAccountApplication.findMany({
      where: { guardianId: user.id },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const data = {
    defaultPhone: user.phone ?? '',
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type as PersonalProductType,
      description: p.description,
      roi: p.roi,
      roiMax: p.roiMax,
      minAmount: p.minAmount,
      maxAmount: p.maxAmount,
    })),
    accounts: memberAccounts.map((a) => ({
      id: a.id,
      productId: a.productId,
      productType: a.product.type as PersonalProductType,
      balance: a.balance,
      status: a.status,
    })),
    payments: payments.map((p) => ({
      id: p.id,
      productName: p.memberAccount.product.name,
      channel: p.channel,
      amount: p.amount,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    })),
    juniorApplications: juniorApplications.map((a) => ({
      id: a.id,
      childFullName: a.childFullName,
      status: a.status,
      reviewNotes: a.reviewNotes,
      createdAt: a.createdAt.toISOString(),
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Accounts</h1>
        <p className="text-muted-foreground">
          Your personal Ludeva accounts — separate from your chama's pooled fund. Fund them any time
          with M-Pesa or a Visa card.
        </p>
      </div>
      <AccountsClient data={data} />
    </div>
  );
}
