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
import { Textarea } from '@/components/ui/textarea';
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
import { HeartHandshake, Wallet } from 'lucide-react';
import { formatKES } from '@/lib/chama-levels';
import { CountUp } from '@/components/motion/CountUp';
import { fundLastRespect, raiseLastRespectClaim, decideLastRespectClaim, payLastRespectClaim } from './actions';
import type { ChamaPermissions } from '@/lib/chama';

type Claim = {
  id: string;
  claimantName: string | null;
  claimantId: string;
  deceasedName: string;
  relation: string;
  amount: number;
  notes: string | null;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  createdAt: string;
};

type Data = {
  permissions: ChamaPermissions;
  isOwner: boolean;
  contribution: number;
  balance: number;
  claims: Claim[];
};

const STATUS_VARIANT: Record<Claim['status'], 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  PAID: 'default',
  REJECTED: 'destructive',
};

export function LastRespectClient({ data, currentUserId }: { data: Data; currentUserId: string }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [fundOpen, setFundOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [claimOpen, setClaimOpen] = useState(false);
  const [deceasedName, setDeceasedName] = useState('');
  const [relation, setRelation] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [notes, setNotes] = useState('');

  const canFund = data.isOwner || data.permissions.canInvestPooled;
  const canDecide = data.isOwner || data.permissions.canApproveLoans;

  const handleFund = () => {
    startTransition(async () => {
      try {
        await fundLastRespect(Number(fundAmount));
        toast({ title: 'Fund topped up' });
        setFundOpen(false);
        setFundAmount('');
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleClaim = () => {
    startTransition(async () => {
      try {
        await raiseLastRespectClaim({ deceasedName, relation, amount: Number(claimAmount), notes });
        toast({ title: 'Claim submitted' });
        setClaimOpen(false);
        setDeceasedName('');
        setRelation('');
        setClaimAmount('');
        setNotes('');
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleDecide = (id: string, decision: 'APPROVE' | 'REJECT') => {
    startTransition(async () => {
      try {
        await decideLastRespectClaim(id, decision);
        toast({ title: decision === 'APPROVE' ? 'Claim approved' : 'Claim rejected' });
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handlePay = (id: string) => {
    startTransition(async () => {
      try {
        await payLastRespectClaim(id);
        toast({ title: 'Claim paid out' });
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardDescription className="flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-chama" /> Fund Balance
            </CardDescription>
            <CardTitle className="font-figures text-3xl mt-1">
              KES <CountUp value={data.balance} />
            </CardTitle>
          </div>
          {canFund && (
            <Dialog open={fundOpen} onOpenChange={setFundOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Top Up Fund</Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Top up Last Respect Cover</DialogTitle>
                  <DialogDescription>Add contributions collected from members into the fund.</DialogDescription>
                </DialogHeader>
                <div>
                  <Label htmlFor="fundAmount">Amount (KES)</Label>
                  <Input id="fundAmount" type="number" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button onClick={handleFund} disabled={isPending || !fundAmount}>
                    {isPending ? 'Saving...' : 'Add to Fund'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-chama" /> Claims
            </CardTitle>
            <CardDescription>Raise a claim for yourself or an immediate family member.</CardDescription>
          </div>
          <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
            <DialogTrigger asChild>
              <Button>Raise a Claim</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Raise a Last Respect claim</DialogTitle>
                <DialogDescription>Your Team Leader will review this before it's paid out.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="deceasedName">Name of the deceased</Label>
                  <Input id="deceasedName" value={deceasedName} onChange={(e) => setDeceasedName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="relation">Relation (e.g. Self, Spouse, Child, Parent)</Label>
                  <Input id="relation" value={relation} onChange={(e) => setRelation(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="claimAmount">Amount requested (KES)</Label>
                  <Input id="claimAmount" type="number" value={claimAmount} onChange={(e) => setClaimAmount(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleClaim} disabled={isPending || !deceasedName || !relation || !claimAmount}>
                  {isPending ? 'Submitting...' : 'Submit Claim'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.claims.length === 0 && <p className="text-sm text-muted-foreground">No claims yet.</p>}
          {data.claims.map((c) => (
            <Card key={c.id} className="rounded-xl">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">
                    {c.deceasedName} <span className="text-muted-foreground text-sm">({c.relation})</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatKES(c.amount)} · claimed by {c.claimantName ?? 'Unknown member'} on {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                  {c.notes && <p className="text-sm text-muted-foreground mt-1">{c.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                  {canDecide && c.status === 'PENDING' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleDecide(c.id, 'APPROVE')} disabled={isPending}>
                        Approve
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDecide(c.id, 'REJECT')} disabled={isPending}>
                        Reject
                      </Button>
                    </>
                  )}
                  {canDecide && c.status === 'APPROVED' && (
                    <Button size="sm" onClick={() => handlePay(c.id)} disabled={isPending}>
                      Pay Out
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
