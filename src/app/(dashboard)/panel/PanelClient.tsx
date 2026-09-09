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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Wallet, HandCoins, FileText } from 'lucide-react';
import Link from 'next/link';
import {
  adjustLoanAccountBalance,
  requestLoan,
  guaranteeLoanRequest,
  markProcessingFeePaid,
  decideLoanRequest,
  markRepaymentPaid,
} from './actions';
import { formatKES } from '@/lib/chama-levels';
import { TeamMembersSection } from '@/components/panel/TeamMembersSection';
import { ProgressBar } from '@/components/ui/progress-bar';
import { CountUp } from '@/components/motion/CountUp';
import type { ChamaPermissions } from '@/lib/chama';

type Member = {
  membershipId: string;
  userId: string;
  fullName: string | null;
  email: string;
} & ChamaPermissions;

type Invite = {
  id: string;
  email: string;
  token: string;
  status: string;
  expiresAt: string;
  createdAt: string;
} & ChamaPermissions;

type Repayment = { id: string; weekNumber: number; dueDate: string; amount: number; paid: boolean };
type LoanRequestData = {
  id: string;
  requesterId: string;
  requesterName: string;
  amount: number;
  purpose: string | null;
  status: 'PENDING_GUARANTORS' | 'PENDING_ADMIN' | 'REJECTED' | 'ACTIVE' | 'REPAID';
  months: number | null;
  repaymentWeeks: number | null;
  interestRate: number;
  processingFee: number;
  processingFeePaid: boolean;
  createdAt: string;
  guarantees: { guarantorId: string; guarantorName: string; signatureName: string; signedAt: string }[];
  repayments: Repayment[];
};

type TeamData = {
  id: string;
  name: string;
  isOwner: boolean;
  permissions: ChamaPermissions;
  levelName: string | null;
  monthlyAmount: number | null;
  groupSize: number | null;
  isDiaspora: boolean;
  objectives: string[];
  hasLastRespectCover: boolean;
  owner: { id: string; fullName: string | null; email: string };
  members: Member[];
  invites: Invite[];
  loanAccount: { balance: number };
  loanRequests: LoanRequestData[];
};

const OBJECTIVE_LABELS: Record<string, string> = {
  BUY_ASSETS: 'Buying assets',
  GET_A_LOAN: 'Getting a loan',
  GET_INTEREST: 'Getting interest',
  SCHOOL_FEES: 'School fees',
  DECEMBER_HOLIDAY: 'December holiday',
};

const STATUS_LABEL: Record<LoanRequestData['status'], string> = {
  PENDING_GUARANTORS: 'Needs guarantors',
  PENDING_ADMIN: 'Awaiting Team Leader approval',
  REJECTED: 'Rejected',
  ACTIVE: 'Active',
  REPAID: 'Repaid',
};

const STATUS_VARIANT: Record<LoanRequestData['status'], 'default' | 'secondary' | 'destructive'> = {
  PENDING_GUARANTORS: 'secondary',
  PENDING_ADMIN: 'secondary',
  REJECTED: 'destructive',
  ACTIVE: 'default',
  REPAID: 'default',
};

export function PanelClient({
  team,
  currentUserId,
  defaultTab,
}: {
  team: TeamData;
  currentUserId: string;
  defaultTab?: string;
}) {
  const initialTab = ['members', 'loan-account', 'loan-requests'].includes(defaultTab ?? '')
    ? (defaultTab as string)
    : 'members';

  return (
    <div className="space-y-4">
      {(team.isDiaspora || team.hasLastRespectCover || team.objectives.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {team.isDiaspora && <Badge variant="secondary">Diaspora Chama</Badge>}
          {team.hasLastRespectCover && <Badge variant="secondary">Last Respect Cover Enabled</Badge>}
          {team.objectives.map((o) => (
            <Badge key={o} variant="outline">{OBJECTIVE_LABELS[o] || o}</Badge>
          ))}
        </div>
      )}
      <Tabs key={initialTab} defaultValue={initialTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="loan-account">Loan Account</TabsTrigger>
          <TabsTrigger value="loan-requests">Loan Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <TeamMembersSection team={team} currentUserId={currentUserId} />
        </TabsContent>
        <TabsContent value="loan-account">
          <LoanAccountTab team={team} />
        </TabsContent>
        <TabsContent value="loan-requests">
        <LoanRequestsTab team={team} currentUserId={currentUserId} />
      </TabsContent>
    </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────
// Loan Account — visible to everyone, only the owner funds it
// ─────────────────────────────────────────────
function LoanAccountTab({ team }: { team: TeamData }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [fundOpen, setFundOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const canFund = team.isOwner || team.permissions.canInvestPooled;

  const handleFund = () => {
    const value = Number(amount);
    startTransition(async () => {
      try {
        await adjustLoanAccountBalance(value);
        toast({ title: 'Loan account updated' });
        setFundOpen(false);
        setAmount('');
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Team Loan Account
          </CardTitle>
          <CardDescription>Shared across the whole chama. Visible to every member.</CardDescription>
        </div>
        {canFund && (
          <Dialog open={fundOpen} onOpenChange={setFundOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Adjust Balance</Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Adjust loan account balance</DialogTitle>
                <DialogDescription>
                  Enter a positive amount to fund it, or negative to correct it.
                </DialogDescription>
              </DialogHeader>
              <div>
                <Label htmlFor="amount">Amount (KES)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 50000 or -5000"
                />
              </div>
              <DialogFooter>
                <Button onClick={handleFund} disabled={isPending || !amount}>
                  {isPending ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        <p className="font-figures text-4xl font-bold text-primary">
          KES <CountUp value={team.loanAccount.balance} />
        </p>
        <p className="text-sm text-muted-foreground mt-1">Available for approved loans</p>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Loan Requests — any member can request; needs 2 guarantors from the
// chama (each signing with their typed full name); a 2.5% processing fee
// is confirmed received; owner/canApproveLoans approves/rejects; weekly
// repayment schedule follows automatically from the fixed formula
// (2.5%/month x months, capped at 6, repaid weekly).
// ─────────────────────────────────────────────
const MAX_LOAN_MONTHS = 6;
const MONTHLY_INTEREST_RATE = 2.5;
const PROCESSING_FEE_RATE = 2.5;
const WEEKS_PER_MONTH = 4;

function previewLoanTerms(amount: number, months: number) {
  const term = Math.min(MAX_LOAN_MONTHS, Math.max(1, Math.round(months) || 1));
  const interestRate = Math.round(MONTHLY_INTEREST_RATE * term * 100) / 100;
  const processingFee = Math.round(amount * (PROCESSING_FEE_RATE / 100) * 100) / 100;
  const weeks = term * WEEKS_PER_MONTH;
  const totalRepayable = Math.round(amount * (1 + interestRate / 100) * 100) / 100;
  const installment = weeks > 0 ? Math.floor((totalRepayable / weeks) * 100) / 100 : 0;
  return { term, interestRate, processingFee, weeks, totalRepayable, installment };
}

function LoanRequestsTab({ team, currentUserId }: { team: TeamData; currentUserId: string }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [requestOpen, setRequestOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [months, setMonths] = useState('3');
  const [purpose, setPurpose] = useState('');
  const [signDialogFor, setSignDialogFor] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState('');
  const [signAgreed, setSignAgreed] = useState(false);
  const canApprove = team.isOwner || team.permissions.canApproveLoans;

  const amountNum = Number(amount) || 0;
  const preview = previewLoanTerms(amountNum, Number(months) || 1);

  const handleRequest = () => {
    const value = Number(amount);
    const monthsValue = Number(months);
    startTransition(async () => {
      try {
        await requestLoan({ amount: value, purpose, months: monthsValue });
        toast({ title: 'Loan request submitted', description: 'It needs 2 guarantors before the Team Leader can review it.' });
        setRequestOpen(false);
        setAmount('');
        setMonths('3');
        setPurpose('');
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const openSignDialog = (id: string) => {
    setSignDialogFor(id);
    setSignatureName('');
    setSignAgreed(false);
  };

  const handleGuarantee = () => {
    if (!signDialogFor) return;
    if (!signatureName.trim()) {
      toast({ title: 'Error', description: 'Type your full legal name to sign.', variant: 'destructive' });
      return;
    }
    if (!signAgreed) {
      toast({ title: 'Error', description: 'You must confirm you agree to guarantee this loan.', variant: 'destructive' });
      return;
    }
    const id = signDialogFor;
    startTransition(async () => {
      try {
        await guaranteeLoanRequest(id, signatureName.trim());
        toast({ title: 'Guarantee signed' });
        setSignDialogFor(null);
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleMarkFeePaid = (id: string) => {
    startTransition(async () => {
      try {
        await markProcessingFeePaid(id);
        toast({ title: 'Processing fee confirmed received' });
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleDecision = (id: string, decision: 'APPROVE' | 'REJECT') => {
    startTransition(async () => {
      try {
        await decideLoanRequest(id, decision);
        toast({ title: decision === 'APPROVE' ? 'Loan approved' : 'Loan rejected' });
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleMarkPaid = (id: string) => {
    startTransition(async () => {
      try {
        await markRepaymentPaid(id);
        toast({ title: 'Repayment recorded' });
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HandCoins className="h-5 w-5 text-primary" /> Loan Requests
            </CardTitle>
            <CardDescription>
              Visible to every member. 2.5% per month, term up to 6 months, repaid weekly. Needs 2
              guarantor signatures plus a 2.5% processing fee before disbursement.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/panel/loan-form" target="_blank">
                <FileText className="h-4 w-4 mr-2" /> Blank Loan Form (PDF)
              </Link>
            </Button>
            <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">Request a Loan</Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Request a loan</DialogTitle>
                  <DialogDescription>Two chama members will need to guarantee this before the Team Leader reviews it.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="loanAmount">Amount (KES)</Label>
                    <Input
                      id="loanAmount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 20000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="loanMonths">Term (months, max {MAX_LOAN_MONTHS})</Label>
                    <Input
                      id="loanMonths"
                      type="number"
                      min={1}
                      max={MAX_LOAN_MONTHS}
                      value={months}
                      onChange={(e) => setMonths(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="purpose">Purpose (optional)</Label>
                    <Textarea
                      id="purpose"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="What's this loan for?"
                    />
                  </div>
                  {amountNum > 0 && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                      <p className="font-medium text-sm mb-1">Estimated terms</p>
                      <div className="flex justify-between"><span className="text-muted-foreground">Interest ({preview.term} mo. x 2.5%)</span><span>{preview.interestRate}%</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Processing fee (2.5%, upfront)</span><span>{formatKES(preview.processingFee)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Total repayable</span><span>{formatKES(preview.totalRepayable)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Weekly installment ({preview.weeks} weeks)</span><span>~{formatKES(preview.installment)}</span></div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={handleRequest} disabled={isPending || !amount}>
                    {isPending ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {team.loanRequests.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No loan requests yet.</p>
      )}

      {team.loanRequests.map((req) => {
        const isRequester = req.requesterId === currentUserId;
        const hasGuaranteed = req.guarantees.some((g) => g.guarantorId === currentUserId);
        const canGuarantee =
          req.status === 'PENDING_GUARANTORS' && !isRequester && !hasGuaranteed;
        const unpaidRepayments = req.repayments.filter((r) => !r.paid).length;
        const totalRepayable = Math.round(req.amount * (1 + req.interestRate / 100));

        return (
          <Card key={req.id} className="rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {formatKES(req.amount)}
                  <Badge variant={STATUS_VARIANT[req.status]}>{STATUS_LABEL[req.status]}</Badge>
                </CardTitle>
                <CardDescription>
                  Requested by {req.requesterName} on {new Date(req.createdAt).toLocaleDateString()}
                  {req.purpose ? ` · ${req.purpose}` : ''}
                  {req.months ? ` · ${req.months} month term` : ''}
                  {(req.status === 'ACTIVE' || req.status === 'REPAID') && (
                    <> · {req.interestRate}% interest · total repayable {formatKES(totalRepayable)}</>
                  )}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/panel/loan-form/${req.id}`} target="_blank">
                  <FileText className="h-4 w-4 mr-1.5" /> Loan Form
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="rounded-lg border p-2">
                  <p className="text-muted-foreground">Processing fee</p>
                  <p className="font-medium">{formatKES(req.processingFee)} {req.processingFeePaid ? '✓ Received' : '· Pending'}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-muted-foreground">Term</p>
                  <p className="font-medium">{req.months ?? '—'} month(s)</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-muted-foreground">Interest</p>
                  <p className="font-medium">{req.interestRate}%</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-muted-foreground">Repayment</p>
                  <p className="font-medium">{req.repaymentWeeks ?? '—'} weeks</p>
                </div>
              </div>

              <div className="text-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Guarantors: {req.guarantees.length === 0 ? 'None yet' : req.guarantees.map((g) => g.signatureName).join(', ')}
                  </span>
                  {req.status === 'PENDING_GUARANTORS' && (
                    <span className="font-figures text-xs text-muted-foreground">{req.guarantees.length}/2</span>
                  )}
                </div>
                {req.status === 'PENDING_GUARANTORS' && (
                  <ProgressBar value={req.guarantees.length} max={2} />
                )}
                {req.guarantees.length > 0 && (
                  <ul className="text-xs text-muted-foreground space-y-0.5 pl-1">
                    {req.guarantees.map((g) => (
                      <li key={g.guarantorId}>
                        Signed by <span className="italic">"{g.signatureName}"</span> on {new Date(g.signedAt).toLocaleDateString()}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {canGuarantee && (
                <Button size="sm" variant="outline" onClick={() => openSignDialog(req.id)} disabled={isPending}>
                  Guarantee &amp; sign this loan
                </Button>
              )}

              {canApprove && req.status === 'PENDING_ADMIN' && (
                <div className="space-y-3 pt-2 border-t">
                  {!req.processingFeePaid ? (
                    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
                      <span>Processing fee of {formatKES(req.processingFee)} must be received before this can be approved.</span>
                      <Button size="sm" variant="outline" onClick={() => handleMarkFeePaid(req.id)} disabled={isPending}>
                        Mark Fee Received
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      <Button size="sm" onClick={() => handleDecision(req.id, 'APPROVE')} disabled={isPending}>
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDecision(req.id, 'REJECT')} disabled={isPending}>
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {req.repayments.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-2">
                    Weekly repayment schedule {unpaidRepayments > 0 && `(${unpaidRepayments} remaining)`}
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Week</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        {canApprove && <TableHead className="text-right">Action</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {req.repayments.map((rp) => (
                        <TableRow key={rp.id}>
                          <TableCell>{rp.weekNumber}</TableCell>
                          <TableCell>{new Date(rp.dueDate).toLocaleDateString()}</TableCell>
                          <TableCell>{formatKES(rp.amount)}</TableCell>
                          <TableCell>
                            <Badge variant={rp.paid ? 'default' : 'secondary'}>
                              {rp.paid ? 'Paid' : 'Due'}
                            </Badge>
                          </TableCell>
                          {canApprove && (
                            <TableCell className="text-right">
                              {!rp.paid && (
                                <Button size="sm" variant="ghost" onClick={() => handleMarkPaid(rp.id)} disabled={isPending}>
                                  Mark Paid
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Guarantor e-signature dialog */}
      <Dialog open={!!signDialogFor} onOpenChange={(open) => !open && setSignDialogFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign as guarantor</DialogTitle>
            <DialogDescription>
              By signing, you confirm you understand you are personally liable for this loan if the
              borrower defaults, up to the amount guaranteed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="signatureName">Your full legal name (signature)</Label>
              <Input
                id="signatureName"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="Type your full name to sign"
              />
            </div>
            <label className="flex items-start gap-2 rounded-lg border p-3 text-xs cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-input"
                checked={signAgreed}
                onChange={(e) => setSignAgreed(e.target.checked)}
              />
              <span>I have read and understand the terms of this loan guarantee, and I agree to be a guarantor.</span>
            </label>
          </div>
          <DialogFooter>
            <Button onClick={handleGuarantee} disabled={isPending || !signatureName.trim() || !signAgreed}>
              {isPending ? 'Signing...' : 'Sign & Guarantee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
