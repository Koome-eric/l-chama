'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { formatKES } from '@/lib/chama-levels';
import {
  approveOrganisation,
  rejectOrganisation,
  verifyCampaign,
  unverifyCampaign,
  createInvestmentProduct,
  updateInvestmentProduct,
  toggleInvestmentProductActive,
  syncMemberReportsCsv,
  deleteMemberReport,
} from './actions';

type TeamRow = {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string | null;
  ownerPhone: string | null;
  levelName: string | null;
  businessRegNumber: string | null;
  numberOfMembers: number | null;
  totalDirectors: number | null;
  physicalAddress: string | null;
  additionalComments: string | null;
  approvalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  rejectionReason: string | null;
  isDiaspora: boolean;
  objectives: string[];
  membersRunningSME: number | null;
  membersEmployed: number | null;
  hasLastRespectCover: boolean;
  lastRespectContribution: number | null;
};

type CampaignRow = {
  id: string;
  title: string;
  creatorName: string;
  category: string;
  targetAmount: number;
  raisedAmount: number;
  verified: boolean;
  status: 'ACTIVE' | 'CLOSED';
  createdAt: string;
};

type ProductType = 'MMF' | 'STOCK' | 'BOND' | 'FIXED_DEPOSIT';

type ProductRow = {
  id: string;
  name: string;
  type: ProductType;
  description: string | null;
  roi: number;
  roiMax: number | null;
  duration: number;
  minAmount: number;
  maxAmount: number | null;
  isActive: boolean;
};

type ReportRow = {
  id: string;
  teamName: string | null;
  memberEmail: string;
  memberName: string | null;
  date: string | null;
  principal: string | null;
  rate: string | null;
  roi: string | null;
  withdrawal: string | null;
  closingBal: string | null;
  periodLabel: string | null;
  uploadedAt: string;
};

const TYPE_LABEL: Record<ProductType, string> = {
  MMF: 'Money Market Fund',
  STOCK: 'Stocks',
  BOND: 'Bonds',
  FIXED_DEPOSIT: 'Fixed Deposit',
};

const OBJECTIVE_LABELS: Record<string, string> = {
  BUY_ASSETS: 'Saving to buy assets',
  GET_A_LOAN: 'Saving to get a loan',
  GET_INTEREST: 'Saving to get interest',
  SCHOOL_FEES: 'Saving for school fees',
  DECEMBER_HOLIDAY: 'Saving for December holiday',
};

const STATUS_VARIANT: Record<TeamRow['approvalStatus'], 'default' | 'secondary' | 'destructive'> = {
  PENDING_APPROVAL: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
};

export function AdminClient({
  teams,
  campaigns,
  products,
  reports,
}: {
  teams: TeamRow[];
  campaigns: CampaignRow[];
  products: ProductRow[];
  reports: ReportRow[];
}) {
  const pendingOrgCount = teams.filter((t) => t.approvalStatus === 'PENDING_APPROVAL').length;
  const unverifiedCount = campaigns.filter((c) => !c.verified).length;

  return (
    <Tabs defaultValue="organisations">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="organisations">Organisations ({pendingOrgCount})</TabsTrigger>
        <TabsTrigger value="campaigns">Campaigns ({unverifiedCount})</TabsTrigger>
        <TabsTrigger value="products">Investment Products</TabsTrigger>
        <TabsTrigger value="reports">Member Reports</TabsTrigger>
      </TabsList>
      <TabsContent value="organisations" className="mt-6">
        <OrganisationsAdminSection teams={teams} />
      </TabsContent>
      <TabsContent value="campaigns" className="mt-6">
        <CampaignsAdminSection campaigns={campaigns} />
      </TabsContent>
      <TabsContent value="products" className="mt-6">
        <ProductsAdminSection products={products} />
      </TabsContent>
      <TabsContent value="reports" className="mt-6">
        <MemberReportsAdminSection reports={reports} />
      </TabsContent>
    </Tabs>
  );
}

function OrganisationsAdminSection({ teams }: { teams: TeamRow[] }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [reasonById, setReasonById] = useState<Record<string, string>>({});

  const handleApprove = (id: string) => {
    startTransition(async () => {
      try {
        await approveOrganisation(id);
        toast({ title: 'Organisation approved' });
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleReject = (id: string) => {
    startTransition(async () => {
      try {
        await rejectOrganisation(id, reasonById[id]);
        toast({ title: 'Organisation rejected' });
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const pending = teams.filter((t) => t.approvalStatus === 'PENDING_APPROVAL');
  const decided = teams.filter((t) => t.approvalStatus !== 'PENDING_APPROVAL');

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="font-headline font-semibold text-lg">Pending ({pending.length})</h2>
        {pending.length === 0 && <p className="text-sm text-muted-foreground">Nothing waiting on review.</p>}
        {pending.map((t) => (
          <Card key={t.id} className="rounded-2xl shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {t.name}
                    {t.isDiaspora && <Badge variant="secondary">Diaspora Chama</Badge>}
                  </CardTitle>
                  <CardDescription>
                    Team Leader: {t.ownerName} {t.ownerEmail ? `· ${t.ownerEmail}` : ''} {t.ownerPhone ? `· ${t.ownerPhone}` : ''}
                  </CardDescription>
                </div>
                <Badge variant={STATUS_VARIANT[t.approvalStatus]}>Pending</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="grid sm:grid-cols-2 gap-2 text-sm">
                <div><dt className="text-muted-foreground">Level</dt><dd>{t.levelName || '—'}</dd></div>
                <div><dt className="text-muted-foreground">Registration No.</dt><dd>{t.businessRegNumber || '—'}</dd></div>
                <div><dt className="text-muted-foreground">Members</dt><dd>{t.numberOfMembers ?? '—'}</dd></div>
                <div><dt className="text-muted-foreground">Directors</dt><dd>{t.totalDirectors ?? '—'}</dd></div>
                <div className="sm:col-span-2"><dt className="text-muted-foreground">Address</dt><dd>{t.physicalAddress || '—'}</dd></div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Chama Objectives</dt>
                  <dd>{t.objectives.length > 0 ? t.objectives.map((o) => OBJECTIVE_LABELS[o] || o).join(', ') : '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Members Running SMEs</dt>
                  <dd>{t.membersRunningSME ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Members Employed</dt>
                  <dd>{t.membersEmployed ?? '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Last Respect Cover</dt>
                  <dd>
                    {t.hasLastRespectCover
                      ? `Enabled · KES ${t.lastRespectContribution?.toLocaleString() ?? '—'} per member`
                      : 'Not enabled'}
                  </dd>
                </div>
                {t.additionalComments && (
                  <div className="sm:col-span-2"><dt className="text-muted-foreground">Comments</dt><dd>{t.additionalComments}</dd></div>
                )}
              </dl>
              <div>
                <Textarea
                  placeholder="Rejection reason (optional)"
                  value={reasonById[t.id] ?? ''}
                  onChange={(e) => setReasonById((p) => ({ ...p, [t.id]: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleApprove(t.id)} disabled={isPending}>Approve</Button>
                <Button size="sm" variant="destructive" onClick={() => handleReject(t.id)} disabled={isPending}>Reject</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {decided.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-headline font-semibold text-lg">Decided</h2>
          {decided.map((t) => (
            <Card key={t.id} className="rounded-2xl shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <CardDescription>{t.ownerName}</CardDescription>
                </div>
                <Badge variant={STATUS_VARIANT[t.approvalStatus]}>
                  {t.approvalStatus === 'APPROVED' ? 'Approved' : 'Rejected'}
                </Badge>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignsAdminSection({ campaigns }: { campaigns: CampaignRow[] }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleVerify = (id: string) => {
    startTransition(async () => {
      try {
        await verifyCampaign(id);
        toast({ title: 'Campaign verified' });
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleUnverify = (id: string) => {
    startTransition(async () => {
      try {
        await unverifyCampaign(id);
        toast({ title: 'Verification removed' });
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  if (campaigns.length === 0) {
    return <p className="text-sm text-muted-foreground">No campaigns yet.</p>;
  }

  return (
    <div className="space-y-4">
      {campaigns.map((c) => (
        <Card key={c.id} className="rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base">{c.title}</CardTitle>
              <CardDescription>
                by {c.creatorName} · {c.category} · {formatKES(c.raisedAmount)} of {formatKES(c.targetAmount)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {c.status === 'CLOSED' && <Badge variant="destructive">Closed</Badge>}
              {c.verified ? (
                <Badge>Verified</Badge>
              ) : (
                <Badge variant="secondary">Unverified</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {c.verified ? (
              <Button size="sm" variant="outline" onClick={() => handleUnverify(c.id)} disabled={isPending}>
                Remove Verification
              </Button>
            ) : (
              <Button size="sm" onClick={() => handleVerify(c.id)} disabled={isPending}>
                Verify Campaign
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const EMPTY_PRODUCT_FORM = {
  name: '',
  type: 'MMF' as ProductType,
  description: '',
  roi: '',
  roiMax: '',
  duration: '',
  minAmount: '',
  maxAmount: '',
};

function ProductsAdminSection({ products }: { products: ProductRow[] }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [form, setForm] = useState(EMPTY_PRODUCT_FORM);

  const openCreate = () => {
    setForm(EMPTY_PRODUCT_FORM);
    setCreateOpen(true);
  };

  const openEdit = (p: ProductRow) => {
    setEditing(p);
    setForm({
      name: p.name,
      type: p.type,
      description: p.description ?? '',
      roi: String(p.roi),
      roiMax: p.roiMax != null ? String(p.roiMax) : '',
      duration: String(p.duration),
      minAmount: String(p.minAmount),
      maxAmount: p.maxAmount != null ? String(p.maxAmount) : '',
    });
  };

  const buildInput = () => ({
    name: form.name,
    type: form.type,
    description: form.description || undefined,
    roi: Number(form.roi),
    roiMax: form.roiMax ? Number(form.roiMax) : null,
    duration: Number(form.duration),
    minAmount: Number(form.minAmount),
    maxAmount: form.maxAmount ? Number(form.maxAmount) : null,
  });

  const handleCreate = () => {
    startTransition(async () => {
      try {
        await createInvestmentProduct(buildInput());
        toast({ title: 'Product created' });
        setCreateOpen(false);
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleUpdate = () => {
    if (!editing) return;
    startTransition(async () => {
      try {
        await updateInvestmentProduct(editing.id, buildInput());
        toast({ title: 'Product updated' });
        setEditing(null);
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleToggle = (id: string) => {
    startTransition(async () => {
      try {
        await toggleInvestmentProductActive(id);
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const formFields = (
    <div className="space-y-3">
      <div>
        <Label htmlFor="p-name">Name</Label>
        <Input id="p-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <Label>Type</Label>
        <Select value={form.type} onValueChange={(v: ProductType) => setForm((f) => ({ ...f, type: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(TYPE_LABEL) as ProductType[]).map((t) => (
              <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="p-desc">Description</Label>
        <Textarea id="p-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="p-roi">ROI % p.a. (min, or fixed rate)</Label>
          <Input id="p-roi" type="number" value={form.roi} onChange={(e) => setForm((f) => ({ ...f, roi: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="p-roiMax">ROI % p.a. max (optional, e.g. 13 for "9–13%")</Label>
          <Input id="p-roiMax" type="number" value={form.roiMax} onChange={(e) => setForm((f) => ({ ...f, roiMax: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="p-duration">Term (months)</Label>
          <Input id="p-duration" type="number" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="p-min">Min Amount (KES)</Label>
          <Input id="p-min" type="number" value={form.minAmount} onChange={(e) => setForm((f) => ({ ...f, minAmount: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="p-max">Max Amount (KES, optional)</Label>
          <Input id="p-max" type="number" value={form.maxAmount} onChange={(e) => setForm((f) => ({ ...f, maxAmount: e.target.value }))} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          The product catalog chamas invest their pooled fund into from /invest.
        </p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Investment Product</DialogTitle></DialogHeader>
            {formFields}
            <DialogFooter>
              <Button onClick={handleCreate} disabled={isPending}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {products.length === 0 && <p className="text-sm text-muted-foreground">No products yet.</p>}

      {products.map((p) => (
        <Card key={p.id} className="rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {p.name} <Badge variant="secondary">{TYPE_LABEL[p.type]}</Badge>
              </CardTitle>
              <CardDescription>
                {p.roiMax ? `${p.roi}–${p.roiMax}` : p.roi}% p.a. · {p.duration} mo · {formatKES(p.minAmount)}{p.maxAmount ? ` – ${formatKES(p.maxAmount)}` : '+'}
              </CardDescription>
            </div>
            <Badge variant={p.isActive ? 'default' : 'destructive'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Edit</Button>
            <Button size="sm" variant="outline" onClick={() => handleToggle(p.id)} disabled={isPending}>
              {p.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit {editing?.name}</DialogTitle></DialogHeader>
          {formFields}
          <DialogFooter>
            <Button onClick={handleUpdate} disabled={isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MemberReportsAdminSection({ reports }: { reports: ReportRow[] }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [csv, setCsv] = useState('');

  const handleSync = () => {
    startTransition(async () => {
      try {
        const res = await syncMemberReportsCsv(csv);
        toast({
          title: 'Synced',
          description: `Imported ${res.imported} row${res.imported === 1 ? '' : 's'} (${res.matched} matched to a chama).`,
        });
        setCsv('');
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this report row?')) return;
    startTransition(async () => {
      try {
        await deleteMemberReport(id);
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Sync from Google Sheets</CardTitle>
          <CardDescription>
            Paste a CSV export (header row required: <code>email,name,date,principal,rate,roi,withdrawal,closingBalance,period,notes</code>).
            For automatic syncing, point a Google Sheets Apps Script trigger at <code>/api/member-reports/sync</code> instead — same
            column names, sent as JSON.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={6}
            placeholder="email,name,date,principal,rate,roi,withdrawal,closingBalance,period,notes"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          <Button onClick={handleSync} disabled={isPending || !csv.trim()}>
            {isPending ? 'Syncing...' : 'Sync Rows'}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-headline font-semibold text-lg mb-3">Recent Rows ({reports.length})</h2>
        {reports.length === 0 && <p className="text-sm text-muted-foreground">No member reports synced yet.</p>}
        <div className="space-y-2">
          {reports.map((r) => (
            <Card key={r.id} className="rounded-xl shadow-sm">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {r.memberName || r.memberEmail}{' '}
                    <span className="text-muted-foreground font-normal">
                      · {r.teamName || 'unmatched to a chama'} · {r.periodLabel || r.date || '—'}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Principal {r.principal || '—'} · ROI {r.roi || '—'} · Closing {r.closingBal || '—'}
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(r.id)}>
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
