import { prisma } from '@/lib/prisma';
import { requirePanelAccess } from '@/lib/require-panel-access';
import { InvestClient } from './InvestClient';

export default async function InvestPage() {
  const { ctx } = await requirePanelAccess('/invest');

  const [products, investments, loanAccount] = await Promise.all([
    prisma.investmentProduct.findMany({ where: { isActive: true }, orderBy: { roi: 'desc' } }),
    prisma.teamInvestment.findMany({
      where: { teamId: ctx.team.id },
      include: { product: true, investedBy: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.loanAccount.findUnique({ where: { teamId: ctx.team.id } }),
  ]);

  const data = {
    permissions: ctx.permissions,
    isOwner: ctx.isOwner,
    poolBalance: loanAccount?.balance ?? 0,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      description: p.description,
      roi: p.roi,
      duration: p.duration,
      minAmount: p.minAmount,
      maxAmount: p.maxAmount,
    })),
    investments: investments.map((i) => ({
      id: i.id,
      productName: i.product.name,
      productType: i.product.type,
      amount: i.amount,
      status: i.status,
      investedByName: i.investedBy?.fullName || i.investedBy?.email || null,
      createdAt: i.createdAt.toISOString(),
      completedAt: i.completedAt ? i.completedAt.toISOString() : null,
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Invest</h1>
        <p className="text-muted-foreground">
          Grow your chama's pooled fund by putting it into a Ludeva investment product — the same
          MMF, stocks, bonds, and fixed deposit products Ludeva members invest in individually.
        </p>
      </div>
      <InvestClient data={data} />
    </div>
  );
}
