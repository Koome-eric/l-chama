'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpFromLine, CheckCircle2, XCircle, Clock, ShieldCheck, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatKES } from '@/lib/chama-levels';
import { PLATFORM_WITHDRAWAL_FEE_RATE } from '@/lib/withdrawal-fee';
import { PayoutCalculator } from '@/components/payments/PayoutCalculator';
import { setChamaSignatories, requestChamaWithdrawal, decideChamaWithdrawal } from '../panel/actions';
import type { getChamaWithdrawState } from '../panel/actions';

type WithdrawState = Awaited<ReturnType<typeof getChamaWithdrawState>>;

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', SECRETARY: 'Secretary', TREASURER: 'Treasurer' };

const STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  AWAITING_APPROVALS: { label: 'Awaiting approvals', variant: 'secondary' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  PROCESSING: { label: 'Processing', variant: 'secondary' },
  PAID: { label: 'Paid', variant: 'default' },
  FAILED: { label: 'Payout failed', variant: 'destructive' },
};

export function WithdrawClient({ state, canRequest }: { state: WithdrawState; canRequest: boolean }) {
  const router = useRouter();
  const { toast } = useToast();

  if (state.isLudevaMember) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="font-headline text-2xl font-bold flex items-center gap-2">
            <ArrowUpFromLine className="h-6 w-6 text-primary" /> Withdraw
          </h1>
        </div>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Available balance</p>
            <p className="text-3xl font-bold text-gold">{formatKES(state.availableBalance)}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-primary/30 bg-primary/5">
          <CardContent className="p-6 space-y-2">
            <p className="font-headline font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" /> {state.team.name} is a Ludeva Plc member chama
            </p>
            <p className="text-sm text-muted-foreground">
              Withdrawals for Ludeva member chamas aren't requested in-app and carry no platform fee. Have a member
              email <a href={`mailto:${state.ludevaMemberWithdrawalContact.split(' or ')[0]}`} className="underline">lchama@ludevaplc.co.ke</a>{' '}
              or <a href="mailto:invst@ludevaplc.co.ke" className="underline">invst@ludevaplc.co.ke</a> to request one.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-headline text-2xl font-bold flex items-center gap-2">
          <ArrowUpFromLine className="h-6 w-6 text-primary" /> Withdraw
        </h1>
        <p className="text-sm text-muted-foreground">
          Moving pooled funds out of {state.team.name} needs sign-off from all three signatories: the Admin, the
          Secretary, and the Treasurer.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Available balance</p>
          <p className="text-3xl font-bold text-gold">{formatKES(state.availableBalance)}</p>
        </CardContent>
      </Card>

      <SignatoriesCard state={state} onSaved={() => router.refresh()} toast={toast} />

      {state.myRole ? (
        <RequestWithdrawalDialog
          canRequest={canRequest && state.signatoriesComplete}
          availableBalance={state.availableBalance}
          onDone={() => router.refresh()}
          toast={toast}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Only the Admin, Secretary, or Treasurer can request a withdrawal.
        </p>
      )}

      <div className="space-y-3">
        <h2 className="font-headline font-semibold text-lg">Withdrawal requests</h2>
        {state.requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No withdrawals requested yet.</p>
        ) : (
          state.requests.map((r) => (
            <WithdrawalRequestCard
              key={r.id}
              request={r}
              myUserId={state.myUserId}
              onDecided={() => router.refresh()}
              toast={toast}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SignatoriesCard({
  state,
  onSaved,
  toast,
}: {
  state: WithdrawState;
  onSaved: () => void;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const [secretaryMembershipId, setSecretaryMembershipId] = useState(
    state.members.find((m) => m.userId === state.secretary?.userId)?.id ?? ''
  );
  const [treasurerMembershipId, setTreasurerMembershipId] = useState(
    state.members.find((m) => m.userId === state.treasurer?.userId)?.id ?? ''
  );
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      try {
        await setChamaSignatories({
          secretaryMembershipId: secretaryMembershipId || undefined,
          treasurerMembershipId: treasurerMembershipId || undefined,
        });
        toast({ title: 'Signatories updated' });
        onSaved();
      } catch (err: any) {
        toast({ title: 'Could not update signatories', description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Signatories
        </CardTitle>
        <CardDescription>All three must approve before a withdrawal pays out.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Admin (creator)</span>
          <span className="font-medium">You{!state.isOwner ? "'re not the Admin" : ''}</span>
        </div>

        {state.isOwner ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Secretary</Label>
                <Select value={secretaryMembershipId} onValueChange={setSecretaryMembershipId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Treasurer</Label>
                <Select value={treasurerMembershipId} onValueChange={setTreasurerMembershipId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button size="sm" onClick={save} disabled={isPending}>
              {isPending ? 'Saving…' : 'Save signatories'}
            </Button>
          </>
        ) : (
          <div className="text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Secretary</span>
              <span className="font-medium">{state.secretary?.name ?? 'Not assigned'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Treasurer</span>
              <span className="font-medium">{state.treasurer?.name ?? 'Not assigned'}</span>
            </div>
          </div>
        )}

        {!state.signatoriesComplete && (
          <p className="text-xs text-amber-600">
            {state.isOwner
              ? 'Assign a Secretary and Treasurer above before a withdrawal can be requested.'
              : 'Waiting for the Admin to assign a Secretary and Treasurer.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RequestWithdrawalDialog({
  canRequest,
  availableBalance,
  onDone,
  toast,
}: {
  canRequest: boolean;
  availableBalance: number;
  onDone: () => void;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    const value = Number(amount);
    startTransition(async () => {
      try {
        await requestChamaWithdrawal({ amount: value, destinationPhone: phone, reason });
        toast({ title: 'Withdrawal requested', description: 'The other two signatories have been notified.' });
        setOpen(false);
        setAmount('');
        setPhone('');
        setReason('');
        onDone();
      } catch (err: any) {
        toast({ title: 'Could not request withdrawal', description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!canRequest} className="gap-2">
          <ArrowUpFromLine className="h-4 w-4" /> Request a withdrawal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Request a withdrawal</DialogTitle>
          <DialogDescription>
            Up to {formatKES(availableBalance)} available. A flat {(PLATFORM_WITHDRAWAL_FEE_RATE * 100).toFixed(1)}%
            platform fee applies. Your own sign-off is recorded automatically — the other two signatories still need
            to approve before this pays out.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="wdAmount">Amount (KES)</Label>
            <Input id="wdAmount" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          {Number(amount) > 0 && <PayoutCalculator amount={Number(amount)} />}
          <div>
            <Label htmlFor="wdPhone">Pay out to (M-Pesa number)</Label>
            <Input id="wdPhone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" />
          </div>
          <div>
            <Label htmlFor="wdReason">Reason (optional)</Label>
            <Textarea id="wdReason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={isPending || !amount || Number(amount) <= 0 || !phone}>
            {isPending ? 'Submitting…' : 'Submit request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawalRequestCard({
  request,
  myUserId,
  onDecided,
  toast,
}: {
  request: WithdrawState['requests'][number];
  myUserId: string;
  onDecided: () => void;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const [comment, setComment] = useState('');
  const [isPending, startTransition] = useTransition();
  const meta = STATUS_META[request.status] ?? { label: request.status, variant: 'secondary' as const };
  const myApproval = request.approvals.find((a) => a.approverId === myUserId);

  const decide = (decision: 'APPROVED' | 'REJECTED') => {
    startTransition(async () => {
      try {
        await decideChamaWithdrawal({ withdrawalRequestId: request.id, decision, comment });
        toast({ title: decision === 'APPROVED' ? 'Approved' : 'Rejected' });
        onDecided();
      } catch (err: any) {
        toast({ title: 'Could not record decision', description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-lg">{formatKES(request.amount)}</p>
            <p className="text-xs text-muted-foreground">
              Net {formatKES(request.netAmount)} to {request.destinationPhone}
              {request.feeAmount > 0 && <> · fee {formatKES(request.feeAmount)}</>}
            </p>
            {request.reason && <p className="text-sm mt-1">{request.reason}</p>}
            {request.failureReason && <p className="text-xs text-destructive mt-1">{request.failureReason}</p>}
          </div>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {request.approvals.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs">
              {a.decision === 'APPROVED' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              ) : a.decision === 'REJECTED' ? (
                <XCircle className="h-3.5 w-3.5 text-destructive" />
              ) : (
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              {ROLE_LABEL[a.role]}: {a.approver.fullName || a.approver.email || 'Member'}
            </span>
          ))}
        </div>

        {request.status === 'AWAITING_APPROVALS' && myApproval?.decision === 'PENDING' && (
          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor={`comment-${request.id}`} className="text-xs">
              Comment (optional)
            </Label>
            <Textarea id={`comment-${request.id}`} value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => decide('APPROVED')} disabled={isPending} className="gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => decide('REJECTED')} disabled={isPending} className="gap-1.5">
                <XCircle className="h-4 w-4" /> Reject
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
