'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Share2, Copy, ShieldCheck, ArrowUpFromLine, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatKES } from '@/lib/chama-levels';
import { PayoutCalculator } from '@/components/payments/PayoutCalculator';
import {
  findUserForSignatory,
  setCampaignSignatories,
  requestCampaignWithdrawal,
  decideCampaignWithdrawal,
  updateCampaignImage,
} from '../actions';
import type { getCampaignWithdrawState } from '../actions';
import { ImageUploadField } from '@/components/uploads/ImageUploadField';

type WithdrawState = Awaited<ReturnType<typeof getCampaignWithdrawState>>;

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', SECRETARY: 'Secretary', TREASURER: 'Treasurer' };
const STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  AWAITING_APPROVALS: { label: 'Awaiting approvals', variant: 'secondary' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  PROCESSING: { label: 'Processing', variant: 'secondary' },
  PAID: { label: 'Paid', variant: 'default' },
  FAILED: { label: 'Payout failed', variant: 'destructive' },
};

export function CampaignCoverImage({ campaignId, imageUrl }: { campaignId: string; imageUrl: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const save = (url: string) => {
    startTransition(async () => {
      try {
        await updateCampaignImage(campaignId, url);
        toast({ title: url ? 'Cover image updated' : 'Cover image removed' });
        router.refresh();
      } catch (err: any) {
        toast({ title: 'Could not update image', description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <div className={isPending ? 'opacity-60 pointer-events-none' : undefined}>
      <ImageUploadField label="Cover image" value={imageUrl ?? ''} onChange={save} folder="campaigns" uploadLabel="cover" />
    </div>
  );
}

export function ShareCampaignCard({ campaignId }: { campaignId: string }) {
  const { toast } = useToast();
  const link = typeof window !== 'undefined' ? `${window.location.origin}/give/${campaignId}` : `/give/${campaignId}`;

  const copy = () => {
    navigator.clipboard.writeText(link).then(() => toast({ title: 'Link copied', description: 'Share it on WhatsApp, SMS, or social media.' }));
  };

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6 space-y-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" /> Share this campaign
        </p>
        <p className="text-xs text-muted-foreground">
          Anyone with this link can view the goal and give via M-Pesa or card — no L Chama account needed.
        </p>
        <div className="flex gap-2">
          <Input readOnly value={link} className="text-xs" />
          <Button size="sm" variant="secondary" onClick={copy} className="shrink-0 gap-1.5">
            <Copy className="h-3.5 w-3.5" /> Copy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CampaignWithdrawSection({ state }: { state: WithdrawState }) {
  const router = useRouter();
  const { toast } = useToast();
  const refresh = () => router.refresh();

  return (
    <div className="space-y-4">
      <SignatoriesCard state={state} onSaved={refresh} toast={toast} />

      {state.myRole ? (
        <>
          <p className="text-xs text-muted-foreground">
            Your withdrawal fee rate: <span className="font-semibold text-foreground">{(state.myWithdrawalFeeRate * 100).toFixed(1)}%</span>
            {state.myWithdrawalFeeRate > 0.05 && (
              <>
                {' '}— existing Ludeva Plc members pay 5%.{' '}
                <Link href="/profile" className="underline">
                  Add your Ludeva membership number
                </Link>{' '}
                to qualify, once confirmed by an admin.
              </>
            )}
          </p>
          <RequestWithdrawalDialog
            campaignId={state.campaignId}
            canRequest={state.signatoriesComplete}
            availableBalance={state.availableBalance}
            feeRate={state.myWithdrawalFeeRate}
            onDone={refresh}
            toast={toast}
          />
          <div className="space-y-3">
            {state.requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No withdrawals requested yet.</p>
            ) : (
              state.requests.map((r) => (
                <WithdrawalRequestCard key={r.id} request={r} campaignId={state.campaignId} myUserId={state.myUserId} onDecided={refresh} toast={toast} />
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function SignatoriesCard({ state, onSaved, toast }: { state: WithdrawState; onSaved: () => void; toast: ReturnType<typeof useToast>['toast'] }) {
  const [secretaryQuery, setSecretaryQuery] = useState('');
  const [treasurerQuery, setTreasurerQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      try {
        let secretaryId: string | undefined;
        let treasurerId: string | undefined;
        if (secretaryQuery.trim()) secretaryId = (await findUserForSignatory(secretaryQuery)).id;
        if (treasurerQuery.trim()) treasurerId = (await findUserForSignatory(treasurerQuery)).id;
        await setCampaignSignatories({ campaignId: state.campaignId, secretaryId, treasurerId });
        toast({ title: 'Signatories updated' });
        setSecretaryQuery('');
        setTreasurerQuery('');
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
        <CardDescription>Withdrawing donated funds needs all three to sign off.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Admin (creator)</span>
          <span className="font-medium">{state.admin.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Secretary</span>
          <span className="font-medium">{state.secretary?.name ?? 'Not assigned'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Treasurer</span>
          <span className="font-medium">{state.treasurer?.name ?? 'Not assigned'}</span>
        </div>

        {state.isCreator && (
          <div className="space-y-2 pt-2 border-t">
            <div>
              <Label htmlFor="secQuery" className="text-xs">
                Assign Secretary (phone or email of an existing member)
              </Label>
              <Input id="secQuery" value={secretaryQuery} onChange={(e) => setSecretaryQuery(e.target.value)} placeholder="0712345678 or name@email.com" />
            </div>
            <div>
              <Label htmlFor="treQuery" className="text-xs">
                Assign Treasurer
              </Label>
              <Input id="treQuery" value={treasurerQuery} onChange={(e) => setTreasurerQuery(e.target.value)} placeholder="0712345678 or name@email.com" />
            </div>
            <Button size="sm" onClick={save} disabled={isPending || (!secretaryQuery.trim() && !treasurerQuery.trim())}>
              {isPending ? 'Saving…' : 'Save signatories'}
            </Button>
          </div>
        )}

        {!state.signatoriesComplete && (
          <p className="text-xs text-amber-600">
            {state.isCreator ? 'Assign a Secretary and Treasurer above before a withdrawal can be requested.' : 'Waiting for the creator to assign a Secretary and Treasurer.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RequestWithdrawalDialog({
  campaignId,
  canRequest,
  availableBalance,
  feeRate,
  onDone,
  toast,
}: {
  campaignId: string;
  canRequest: boolean;
  availableBalance: number;
  feeRate: number;
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
        await requestCampaignWithdrawal({ campaignId, amount: value, destinationPhone: phone, reason });
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
        <Button disabled={!canRequest} className="w-full gap-2">
          <ArrowUpFromLine className="h-4 w-4" /> Request a withdrawal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Request a withdrawal</DialogTitle>
          <DialogDescription>
            Up to {formatKES(availableBalance)} available. A flat {(feeRate * 100).toFixed(1)}%
            platform fee applies. Your own sign-off is recorded automatically — the other two signatories still need
            to approve.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="cwdAmount">Amount (KES)</Label>
            <Input id="cwdAmount" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          {Number(amount) > 0 && <PayoutCalculator amount={Number(amount)} feeRate={feeRate} />}
          <div>
            <Label htmlFor="cwdPhone">Pay out to (M-Pesa number)</Label>
            <Input id="cwdPhone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" />
          </div>
          <div>
            <Label htmlFor="cwdReason">Reason (optional)</Label>
            <Textarea id="cwdReason" value={reason} onChange={(e) => setReason(e.target.value)} />
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
  campaignId,
  myUserId,
  onDecided,
  toast,
}: {
  request: WithdrawState['requests'][number];
  campaignId: string;
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
        await decideCampaignWithdrawal({ withdrawalRequestId: request.id, campaignId, decision, comment });
        toast({ title: decision === 'APPROVED' ? 'Approved' : 'Rejected' });
        onDecided();
      } catch (err: any) {
        toast({ title: 'Could not record decision', description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{formatKES(request.amount)}</p>
            <p className="text-xs text-muted-foreground">
              Net {formatKES(request.netAmount)} to {request.destinationPhone} · fee {formatKES(request.feeAmount)}
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
              {ROLE_LABEL[a.role]}: {a.approver.fullName || a.approver.email || 'Signatory'}
            </span>
          ))}
        </div>

        {request.status === 'AWAITING_APPROVALS' && myApproval?.decision === 'PENDING' && (
          <div className="space-y-2 pt-2 border-t">
            <Textarea placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
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
