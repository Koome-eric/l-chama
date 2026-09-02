'use client';

import { useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Wallet, PiggyBank } from 'lucide-react';
import { formatKES } from '@/lib/chama-levels';
import { investPooledFunds, closeInvestment } from './actions';
import { CountUp } from '@/components/motion/CountUp';
import type { ChamaPermissions } from '@/lib/chama';

type Product = {
  id: string;
  name: string;
  type: 'MMF' | 'STOCK' | 'BOND' | 'FIXED_DEPOSIT';
  description: string | null;
  roi: number;
  roiMax: number | null;
  duration: number;
  minAmount: number;
  maxAmount: number | null;
};

type Investment = {
  id: string;
  productName: string;
  productType: Product['type'];
  amount: number;
  status: 'ACTIVE' | 'COMPLETED';
  investedByName: string | null;
  createdAt: string;
  completedAt: string | null;
};

type Data = {
  permissions: ChamaPermissions;
  isOwner: boolean;
  poolBalance: number;
  products: Product[];
  investments: Investment[];
};

const TYPE_LABEL: Record<Product['type'], string> = {
  MMF: 'Money Market Fund',
  STOCK: 'Stocks',
  BOND: 'Bonds',
  FIXED_DEPOSIT: 'Fixed Deposit',
};

export function InvestClient({ data }: { data: Data }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Product | null>(null);
  const [amount, setAmount] = useState('');

  const canInvest = data.isOwner || data.permissions.canInvestPooled;
  const canViewPool = data.isOwner || data.permissions.canViewPooledFunds;
  const canWithdraw = data.isOwner || data.permissions.canWithdraw;

  const activeTotal = data.investments
    .filter((i) => i.status === 'ACTIVE')
    .reduce((sum, i) => sum + i.amount, 0);

  const handleInvest = () => {
    if (!selected) return;
    const value = Number(amount);
    startTransition(async () => {
      try {
        await investPooledFunds({ productId: selected.id, amount: value });
        toast({ title: 'Investment made', description: `Invested ${formatKES(value)} into ${selected.name}.` });
        setSelected(null);
        setAmount('');
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleClose = (id: string) => {
    if (!confirm('Close this investment and return the principal to the pooled fund?')) return;
    startTransition(async () => {
      try {
        await closeInvestment(id);
        toast({ title: 'Investment closed' });
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="space-y-6">
      {canViewPool && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>Available Pooled Fund</CardDescription>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <CardTitle className="font-figures text-2xl">
                KES <CountUp value={data.poolBalance} />
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">From the chama loan account</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>Currently Invested</CardDescription>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <CardTitle className="font-figures text-2xl">
                KES <CountUp value={activeTotal} />
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Across active investments</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <h2 className="font-headline text-lg font-semibold mb-3">Available Products</h2>
        {data.products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No investment products are open right now.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {data.products.map((p) => (
              <Card key={p.id} className="rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                    <Badge variant="secondary">{TYPE_LABEL[p.type]}</Badge>
                  </div>
                  {p.description && <CardDescription>{p.description}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-1 text-sm font-figures">
                  <p><span className="font-sans text-muted-foreground">ROI:</span> <span className="font-semibold text-primary">{p.roiMax ? `${p.roi}–${p.roiMax}` : p.roi}% p.a.</span></p>
                  <p><span className="font-sans text-muted-foreground">Term:</span> {p.duration} month{p.duration === 1 ? '' : 's'}</p>
                  <p>
                    <span className="font-sans text-muted-foreground">Range:</span> {formatKES(p.minAmount)}
                    {p.maxAmount ? ` – ${formatKES(p.maxAmount)}` : '+'}
                  </p>
                </CardContent>
                {canInvest && (
                  <CardFooter>
                    <Dialog open={selected?.id === p.id} onOpenChange={(open) => setSelected(open ? p : null)}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                          <PiggyBank className="h-4 w-4" /> Invest Pooled Funds
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Invest in {p.name}</DialogTitle>
                          <DialogDescription>
                            This moves cash out of your chama's pooled fund (currently {formatKES(data.poolBalance)}).
                          </DialogDescription>
                        </DialogHeader>
                        <div>
                          <Label htmlFor="investAmount">Amount (KES)</Label>
                          <Input
                            id="investAmount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={`Min ${p.minAmount.toLocaleString()}`}
                          />
                        </div>
                        <DialogFooter>
                          <Button onClick={handleInvest} disabled={isPending || !amount}>
                            {isPending ? 'Investing...' : 'Confirm Investment'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-headline text-lg font-semibold mb-3">Your Chama's Investments</h2>
        {data.investments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No investments yet.</p>
        ) : (
          <div className="space-y-3">
            {data.investments.map((i) => (
              <Card key={i.id} className="rounded-2xl shadow-sm">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium">{i.productName} <span className="text-muted-foreground text-sm">({TYPE_LABEL[i.productType]})</span></p>
                    <p className="text-sm text-muted-foreground">
                      {formatKES(i.amount)} · invested by {i.investedByName ?? 'Unknown member'} on {new Date(i.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={i.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {i.status === 'ACTIVE' ? 'Active' : 'Closed'}
                    </Badge>
                    {canWithdraw && i.status === 'ACTIVE' && (
                      <Button size="sm" variant="outline" onClick={() => handleClose(i.id)} disabled={isPending}>
                        Close &amp; Return
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
