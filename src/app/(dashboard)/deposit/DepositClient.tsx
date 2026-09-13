'use client';

import { useEffect, useState, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowDownToLine, Smartphone, CreditCard, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { formatKES } from '@/lib/chama-levels';
import { initiateDepositMpesaPayment, initiateDepositCardPayment } from './actions';

type Deposit = {
  id: string;
  amount: number;
  channel: string;
  status: string;
  createdAt: string;
  memberName: string;
};

const STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: typeof CheckCircle2 }> = {
  PENDING: { label: 'Pending', variant: 'secondary', icon: Clock },
  SUCCESS: { label: 'Confirmed', variant: 'default', icon: CheckCircle2 },
  FAILED: { label: 'Failed', variant: 'destructive', icon: XCircle },
  CANCELLED: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
};

export function DepositClient({
  teamName,
  availableBalance,
  deposits,
}: {
  teamName: string;
  availableBalance: number;
  deposits: Deposit[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [isPending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (!payment) return;
    if (payment === 'success') {
      toast({ title: 'Deposit confirmed', description: `Your card deposit to ${teamName}'s loan account was successful.` });
    } else if (payment === 'failed') {
      toast({ title: 'Deposit not completed', description: 'The payment did not go through. You can try again.', variant: 'destructive' });
    } else if (payment === 'error') {
      toast({ title: 'Could not confirm deposit', description: 'If money left your account, it will still be credited shortly.', variant: 'destructive' });
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('payment');
    window.history.replaceState({}, '', url.toString());
    router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const depositMpesa = () => {
    const value = Number(amount);
    startTransition(async () => {
      try {
        const res = await initiateDepositMpesaPayment({ amount: value, phone });
        setConfirmation(res.message);
        setAmount('');
        setPhone('');
      } catch (err: any) {
        toast({ title: 'Could not process deposit', description: err.message, variant: 'destructive' });
      }
    });
  };

  const depositCard = () => {
    const value = Number(amount);
    startTransition(async () => {
      try {
        const res = await initiateDepositCardPayment({ amount: value });
        if (res.authorizationUrl) {
          window.location.href = res.authorizationUrl;
          return;
        }
      } catch (err: any) {
        toast({ title: 'Could not process deposit', description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-headline text-2xl font-bold flex items-center gap-2">
          <ArrowDownToLine className="h-6 w-6 text-primary" /> Deposit
        </h1>
        <p className="text-sm text-muted-foreground">Top up {teamName}'s shared loan account via M-Pesa or card.</p>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Current loan account balance</p>
          <p className="text-3xl font-bold text-primary">{formatKES(availableBalance)}</p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Make a deposit</CardTitle>
          <CardDescription>Every member can top up the pool — funds are credited as soon as payment is confirmed.</CardDescription>
        </CardHeader>
        <CardContent>
          {confirmation ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-center space-y-3">
              <p>{confirmation}</p>
              <Button size="sm" variant="outline" onClick={() => setConfirmation(null)}>
                Make another deposit
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="depositAmount">Amount (KES)</Label>
                <Input
                  id="depositAmount"
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 1000"
                />
              </div>

              <Tabs defaultValue="mpesa">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="mpesa" className="gap-1.5">
                    <Smartphone className="h-3.5 w-3.5" /> M-Pesa
                  </TabsTrigger>
                  <TabsTrigger value="card" className="gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" /> Visa Card
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="mpesa" className="space-y-3 pt-2">
                  <div>
                    <Label htmlFor="depositPhone">M-Pesa Number</Label>
                    <Input id="depositPhone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" />
                  </div>
                  <p className="text-xs text-muted-foreground">You'll get a prompt on your phone to enter your M-Pesa PIN.</p>
                  <Button
                    onClick={depositMpesa}
                    disabled={isPending || !amount || Number(amount) <= 0 || !phone}
                    className="w-full gap-2"
                  >
                    <Smartphone className="h-4 w-4" /> {isPending ? 'Sending…' : 'Deposit with M-Pesa'}
                  </Button>
                </TabsContent>

                <TabsContent value="card" className="space-y-3 pt-2">
                  <p className="text-xs text-muted-foreground">
                    You'll be sent to a secure checkout page to enter your Visa card details.
                  </p>
                  <Button onClick={depositCard} disabled={isPending || !amount || Number(amount) <= 0} className="w-full gap-2">
                    <CreditCard className="h-4 w-4" /> {isPending ? 'Redirecting…' : 'Deposit with Visa Card'}
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="font-headline font-semibold text-lg">Recent deposits</h2>
        {deposits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No deposits yet — be the first to top up the pool.</p>
        ) : (
          <div className="space-y-2">
            {deposits.map((d) => {
              const meta = STATUS_META[d.status] ?? { label: d.status, variant: 'secondary' as const, icon: Clock };
              const Icon = meta.icon;
              return (
                <div key={d.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                  <div>
                    <p className="font-medium">{formatKES(d.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.memberName} · {d.channel === 'MPESA' ? 'M-Pesa' : 'Visa Card'} ·{' '}
                      {new Date(d.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={meta.variant} className="gap-1">
                    <Icon className="h-3 w-3" /> {meta.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
