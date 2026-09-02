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
import { Wallet, HandCoins } from 'lucide-react';
import {
  adjustLoanAccountBalance,
  requestLoan,
  guaranteeLoanRequest,
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
  repaymentWeeks: number | null;
  interestRate: number;
  createdAt: string;
  guarantees: { guarantorId: string; guarantorName: string }[];
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
// chama; owner approves/rejects; weekly repayment schedule once approved
// ─────────────────────────────────────────────
function LoanRequestsTab({ team, currentUserId }: { team: TeamData; currentUserId: string }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [requestOpen, setRequestOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [weeksById, setWeeksById] = useState<Record<string, string>>({});
  const [rateById, setRateById] = useState<Record<string, string>>({});
  const canApprove = team.isOwner || team.permissions.canApproveLoans;

  const handleRequest = () => {
    const value = Number(amount);
    startTransition(async () => {
      try {
        await requestLoan({ amount: value, purpose });
        toast({ title: 'Loan request submitted', description: 'It needs 2 guarantors before the Team Leader can review it.' });
        setRequestOpen(false);
        setAmount('');
        setPurpose('');
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleGuarantee = (id: string) => {
    startTransition(async () => {
      try {
        await guaranteeLoanRequest(id);
        toast({ title: 'Guarantee added' });
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleDecision = (id: string, decision: 'APPROVE' | 'REJECT') => {
    const weeks = decision === 'APPROVE' ? Number(weeksById[id] || 4) : undefined;
    const rate = decision === 'APPROVE' ? Math.max(3, Number(rateById[id] || 3)) : undefined;
    startTransition(async () => {
      try {
        await decideLoanRequest(id, decision, weeks, rate);
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HandCoins className="h-5 w-5 text-primary" /> Loan Requests
            </CardTitle>
            <CardDescription>Visible to every member. Needs 2 fellow members to guarantee it.</CardDescription>
          </div>
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
                  <Label htmlFor="purpose">Purpose (optional)</Label>
                  <Textarea
                    id="purpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="What's this loan for?"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleRequest} disabled={isPending || !amount}>
                  {isPending ? 'Submitting...' : 'Submit Request'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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

        return (
          <Card key={req.id} className="rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {formatKES(req.amount)}
                  <Badge variant={STATUS_VARIANT[req.status]}>{STATUS_LABEL[req.status]}</Badge>
                </CardTitle>
                <CardDescription>
                  Requested by {req.requesterName} on {new Date(req.createdAt).toLocaleDateString()}
                  {req.purpose ? ` · ${req.purpose}` : ''}
                  {(req.status === 'ACTIVE' || req.status === 'REPAID') && (
                    <> · {req.interestRate}% interest · total repayable {formatKES(Math.round(req.amount * (1 + req.interestRate / 100)))}</>
                  )}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Guarantors: {req.guarantees.length === 0 ? 'None yet' : req.guarantees.map((g) => g.guarantorName).join(', ')}
                  </span>
                  {req.status === 'PENDING_GUARANTORS' && (
                    <span className="font-figures text-xs text-muted-foreground">{req.guarantees.length}/2</span>
                  )}
                </div>
                {req.status === 'PENDING_GUARANTORS' && (
                  <ProgressBar value={req.guarantees.length} max={2} />
                )}
              </div>

              {canGuarantee && (
                <Button size="sm" variant="outline" onClick={() => handleGuarantee(req.id)} disabled={isPending}>
                  Guarantee this loan
                </Button>
              )}

              {canApprove && req.status === 'PENDING_ADMIN' && (
                <div className="flex flex-wrap items-end gap-3 pt-2 border-t">
                  <div>
                    <Label htmlFor={`weeks-${req.id}`} className="text-xs">Repayment weeks</Label>
                    <Input
                      id={`weeks-${req.id}`}
                      type="number"
                      min={1}
                      className="w-24"
                      value={weeksById[req.id] ?? '4'}
                      onChange={(e) => setWeeksById((p) => ({ ...p, [req.id]: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`rate-${req.id}`} className="text-xs">Interest rate (% p.a., min 3)</Label>
                    <Input
                      id={`rate-${req.id}`}
                      type="number"
                      min={3}
                      step={0.5}
                      className="w-32"
                      value={rateById[req.id] ?? '3'}
                      onChange={(e) => setRateById((p) => ({ ...p, [req.id]: e.target.value }))}
                    />
                  </div>
                  <Button size="sm" onClick={() => handleDecision(req.id, 'APPROVE')} disabled={isPending}>
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDecision(req.id, 'REJECT')} disabled={isPending}>
                    Reject
                  </Button>
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
    </div>
  );
}
