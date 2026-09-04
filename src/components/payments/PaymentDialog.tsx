'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Smartphone, CreditCard, Wallet } from 'lucide-react';
import { initiateMpesaPayment, initiateCardPayment } from '@/app/(dashboard)/accounts/actions';

export function PaymentDialog({
  productId,
  productName,
  minAmount,
  defaultPhone,
  trigger,
}: {
  productId: string;
  productName: string;
  minAmount: number;
  defaultPhone?: string;
  trigger?: React.ReactNode;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(defaultPhone ?? '');

  const handleMpesa = () => {
    const value = Number(amount);
    startTransition(async () => {
      try {
        const res = await initiateMpesaPayment({ productId, amount: value, phone });
        toast({ title: 'M-Pesa request sent', description: res.message });
        setOpen(false);
        setAmount('');
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleCard = () => {
    const value = Number(amount);
    startTransition(async () => {
      try {
        const res = await initiateCardPayment({ productId, amount: value });
        toast({ title: 'Card request sent', description: res.message });
        setOpen(false);
        setAmount('');
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-2">
            <Wallet className="h-4 w-4" /> Pay / Fund
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Fund your {productName}</DialogTitle>
          <DialogDescription>
            Minimum {minAmount.toLocaleString()} KES. Choose how you'd like to pay.
          </DialogDescription>
        </DialogHeader>

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
              <Label htmlFor="mpesa-phone">M-Pesa Number</Label>
              <Input
                id="mpesa-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XX XXX XXX"
              />
            </div>
            <div>
              <Label htmlFor="mpesa-amount">Amount (KES)</Label>
              <Input
                id="mpesa-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min ${minAmount.toLocaleString()}`}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              You'll get a prompt on your phone to enter your M-Pesa PIN once this is live.
            </p>
            <DialogFooter className="pt-1">
              <Button onClick={handleMpesa} disabled={isPending || !amount || !phone} className="w-full gap-2">
                <Smartphone className="h-4 w-4" /> {isPending ? 'Sending…' : 'Pay with M-Pesa'}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="card" className="space-y-3 pt-2">
            <div>
              <Label htmlFor="card-amount">Amount (KES)</Label>
              <Input
                id="card-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min ${minAmount.toLocaleString()}`}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              You'll be sent to a secure checkout page to enter your Visa card details once this is live.
              We never collect your card number directly.
            </p>
            <DialogFooter className="pt-1">
              <Button onClick={handleCard} disabled={isPending || !amount} className="w-full gap-2">
                <CreditCard className="h-4 w-4" /> {isPending ? 'Sending…' : 'Pay with Visa Card'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
