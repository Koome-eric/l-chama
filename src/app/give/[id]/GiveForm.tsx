'use client';

import { useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { Smartphone, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { donateToCampaign } from '../actions';

const QUICK_AMOUNTS = [200, 500, 1000, 2500];

export function GiveForm({ campaignId, campaignTitle }: { campaignId: string; campaignTitle: string }) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    const donation = searchParams.get('donation');
    if (!donation) return;
    if (donation === 'success') {
      toast({ title: 'Thank you!', description: `Your donation to ${campaignTitle} was confirmed.` });
    } else if (donation === 'failed') {
      toast({ title: 'Donation not completed', description: 'The payment did not go through. You can try again.', variant: 'destructive' });
    } else if (donation === 'error') {
      toast({ title: 'Could not confirm donation', description: 'If money left your account, it will still be credited shortly.', variant: 'destructive' });
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('donation');
    window.history.replaceState({}, '', url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const give = (method: 'mpesa' | 'card') => {
    const value = Number(amount);
    startTransition(async () => {
      try {
        const res = await donateToCampaign({ campaignId, amount: value, method, phone, guestName: name, message, anonymous });
        if (res.mode === 'redirect' && res.authorizationUrl) {
          window.location.href = res.authorizationUrl;
          return;
        }
        if (res.mode === 'stk') setConfirmation(res.message);
      } catch (err: any) {
        toast({ title: 'Could not process your gift', description: err.message, variant: 'destructive' });
      }
    });
  };

  if (confirmation) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-center">{confirmation}</div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="giveAmount">Amount (KES)</Label>
        <Input id="giveAmount" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 500" />
        <div className="flex gap-2 mt-2">
          {QUICK_AMOUNTS.map((a) => (
            <Button key={a} type="button" size="sm" variant="outline" onClick={() => setAmount(String(a))}>
              {a.toLocaleString()}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="giveName">Your name</Label>
        <Input id="giveName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Displayed on the supporter list (optional if anonymous)" />
      </div>

      <div>
        <Label htmlFor="giveMessage">Message (optional)</Label>
        <Textarea id="giveMessage" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Leave a word of support" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="h-4 w-4 rounded border-input" />
        Give anonymously
      </label>

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
            <Label htmlFor="givePhone">M-Pesa Number</Label>
            <Input id="givePhone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" />
          </div>
          <Button
            onClick={() => give('mpesa')}
            disabled={isPending || !amount || Number(amount) <= 0 || !phone || (!anonymous && !name.trim())}
            className="w-full gap-2"
          >
            <Smartphone className="h-4 w-4" /> {isPending ? 'Sending…' : 'Give with M-Pesa'}
          </Button>
        </TabsContent>

        <TabsContent value="card" className="space-y-3 pt-2">
          <p className="text-xs text-muted-foreground">You'll be sent to a secure checkout page to enter your Visa card details.</p>
          <Button
            onClick={() => give('card')}
            disabled={isPending || !amount || Number(amount) <= 0 || (!anonymous && !name.trim())}
            className="w-full gap-2"
          >
            <CreditCard className="h-4 w-4" /> {isPending ? 'Redirecting…' : 'Give with Visa Card'}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
