'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
  LayoutDashboard,
  Building2,
  HeartHandshake,
  PiggyBank,
  FileSpreadsheet,
  LogOut,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Pencil,
  Power,
  Trash2,
  UploadCloud,
  ChevronRight,
  Home,
  Wallet,
  Baby,
  Smartphone,
  CreditCard,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';

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
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useToast } from '@/hooks/use-toast';
import { formatKES } from '@/lib/chama-levels';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/admin/StatCard';
import { MiniBarChart } from '@/components/admin/MiniBarChart';
import { SearchBox, FilterPill } from '@/components/admin/SectionToolbar';
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
  logoutAdmin,
  resolvePayment,
  decideJuniorApplication,
} from './actions';

/* ────────────────────────────────────────────────────────────── */
/*                              TYPES                              */
/* ────────────────────────────────────────────────────────────── */

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

type ProductType = 'MMF' | 'STOCK' | 'BOND' | 'FIXED_DEPOSIT' | 'SAVINGS' | 'JUNIOR';

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

type PaymentRow = {
  id: string;
  memberName: string;
  productName: string;
  channel: 'MPESA' | 'VISA_CARD';
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  phone: string | null;
  note: string | null;
  createdAt: string;
};

type JuniorApplicationRow = {
  id: string;
  childFullName: string;
  childDateOfBirth: string | null;
  guardianName: string;
  guardianIdNumber: string;
  guardianPhone: string;
  guardianKraPin: string;
  birthCertFileName: string;
  birthCertMimeType: string;
  birthCertData: string;
  childPhotoFileName: string;
  childPhotoMimeType: string;
  childPhotoData: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  reviewNotes: string | null;
  createdAt: string;
};

type Stats = {
  totalUsers: number;
  totalPooledFunds: number;
  orgs: { total: number; pending: number; approved: number; rejected: number };
  campaigns: {
    total: number;
    unverified: number;
    verified: number;
    active: number;
    totalRaised: number;
    totalTarget: number;
  };
  products: { total: number; active: number; inactive: number };
  reports: { total: number; matched: number };
  payments: { total: number; pending: number };
  juniorApplications: { total: number; pending: number };
  monthlyOrgSubmissions: { label: string; value: number }[];
};

type Section = 'overview' | 'organisations' | 'campaigns' | 'products' | 'reports' | 'payments' | 'junior';

const TYPE_LABEL: Record<ProductType, string> = {
  MMF: 'Money Market Fund',
  STOCK: 'Shares Account',
  BOND: 'Bonds',
  FIXED_DEPOSIT: 'Fixed Deposit',
  SAVINGS: 'Savings Account',
  JUNIOR: 'Ludeva Junior Account',
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

/* ────────────────────────────────────────────────────────────── */
/*                          NAV CONFIGURATION                      */
/* ────────────────────────────────────────────────────────────── */

function useNavItems(stats: Stats) {
  return [
    { id: 'overview' as Section, label: 'Overview', icon: LayoutDashboard, badge: 0 },
    { id: 'organisations' as Section, label: 'Organisations', icon: Building2, badge: stats.orgs.pending },
    { id: 'campaigns' as Section, label: 'Campaigns', icon: HeartHandshake, badge: stats.campaigns.unverified },
    { id: 'products' as Section, label: 'Investment Products', icon: PiggyBank, badge: 0 },
    { id: 'payments' as Section, label: 'Payments', icon: Wallet, badge: stats.payments.pending },
    { id: 'junior' as Section, label: 'Junior Accounts', icon: Baby, badge: stats.juniorApplications.pending },
    { id: 'reports' as Section, label: 'Member Reports', icon: FileSpreadsheet, badge: 0 },
  ];
}

const SECTION_META: Record<Section, { title: string; description: string }> = {
  overview: { title: 'Overview', description: 'A snapshot of L-Chama right now.' },
  organisations: { title: 'Organisations', description: 'Review chamas awaiting approval.' },
  campaigns: { title: 'Campaigns', description: 'Verify fundraising campaigns.' },
  products: { title: 'Investment Products', description: 'Manage the catalog chamas invest their pooled fund into.' },
  payments: { title: 'Payments', description: 'M-Pesa and Visa card requests from member accounts, awaiting confirmation.' },
  junior: { title: 'Junior Accounts', description: "Review Ludeva Junior Account applications and their KYC documents." },
  reports: { title: 'Member Reports', description: 'Sync and review performance data from Google Sheets.' },
};

/* ────────────────────────────────────────────────────────────── */
/*                          ROOT COMPONENT                         */
/* ────────────────────────────────────────────────────────────── */

export function AdminClient({
  teams,
  campaigns,
  products,
  reports,
  payments,
  juniorApplications,
  stats,
  authMethod,
}: {
  teams: TeamRow[];
  campaigns: CampaignRow[];
  products: ProductRow[];
  reports: ReportRow[];
  payments: PaymentRow[];
  juniorApplications: JuniorApplicationRow[];
  stats: Stats;
  authMethod: 'clerk' | 'password';
}) {
  const [section, setSection] = useState<Section>('overview');
  const navItems = useNavItems(stats);
  const router = useRouter();
  const [loggingOut, startLogout] = useTransition();

  const handleSignOut = () => {
    startLogout(async () => {
      await logoutAdmin();
      router.refresh();
    });
  };

  return (
    <>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <Link href="/panel" className="flex items-center gap-2.5 px-1 py-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldMark />
            </div>
            <div className="whitespace-nowrap group-data-[collapsible=icon]:hidden">
              <span className="font-headline text-base font-bold leading-none">L-CHAMA</span>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Admin</p>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarContent className="flex flex-col justify-between">
          <SidebarMenu>
            {navItems.map((item) => {
              const active = section === item.id;
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={active}
                    tooltip={item.label}
                    onClick={() => setSection(item.id)}
                    className={cn(
                      'w-full rounded-xl transition-colors',
                      active && 'bg-primary/10 text-primary shadow-sm font-medium'
                    )}
                  >
                    <item.icon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
                    <span className="flex-1 truncate text-left">{item.label}</span>
                    {item.badge > 0 && (
                      <span
                        className={cn(
                          'ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold group-data-[collapsible=icon]:hidden',
                          active ? 'bg-primary text-primary-foreground' : 'bg-destructive/10 text-destructive'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Back to L-Chama" className="rounded-xl text-muted-foreground">
                <Link href="/panel" className="flex items-center gap-3">
                  <Home className="h-4 w-4 shrink-0" />
                  <span className="truncate">Back to site</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {authMethod === 'password' && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleSignOut}
                  disabled={loggingOut}
                  tooltip="Sign out"
                  className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="truncate">{loggingOut ? 'Signing out…' : 'Sign out'}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="min-w-0">
            <h1 className="truncate font-headline text-lg font-semibold sm:text-xl">{SECTION_META[section].title}</h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">{SECTION_META[section].description}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {(() => {
              const totalNeedsReview =
                stats.orgs.pending + stats.campaigns.unverified + stats.payments.pending + stats.juniorApplications.pending;
              if (totalNeedsReview === 0) return null;
              const target: Section =
                stats.orgs.pending > 0
                  ? 'organisations'
                  : stats.campaigns.unverified > 0
                    ? 'campaigns'
                    : stats.payments.pending > 0
                      ? 'payments'
                      : 'junior';
              return (
                <button
                  onClick={() => setSection(target)}
                  className="hidden items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold sm:inline-flex"
                >
                  <Clock className="h-3.5 w-3.5" />
                  {totalNeedsReview} need review
                </button>
              );
            })()}
            {authMethod === 'clerk' ? (
              <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'h-9 w-9 rounded-lg' } }} />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                A
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 bg-muted/40">
          <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
            {section === 'overview' && (
              <OverviewSection stats={stats} teams={teams} campaigns={campaigns} onNavigate={setSection} />
            )}
            {section === 'organisations' && <OrganisationsAdminSection teams={teams} />}
            {section === 'campaigns' && <CampaignsAdminSection campaigns={campaigns} />}
            {section === 'products' && <ProductsAdminSection products={products} />}
            {section === 'payments' && <PaymentsAdminSection payments={payments} />}
            {section === 'junior' && <JuniorAdminSection applications={juniorApplications} />}
            {section === 'reports' && <MemberReportsAdminSection reports={reports} />}
          </div>
        </main>
      </SidebarInset>
    </>
  );
}

function ShieldMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" strokeWidth={2}>
      <path
        d="M12 2.5 4 5.75V11c0 5.05 3.4 8.86 8 10.5 4.6-1.64 8-5.45 8-10.5V5.75L12 2.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path d="m8.5 12 2.4 2.4L15.5 9.6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*                              OVERVIEW                            */
/* ────────────────────────────────────────────────────────────── */

function OverviewSection({
  stats,
  teams,
  campaigns,
  onNavigate,
}: {
  stats: Stats;
  teams: TeamRow[];
  campaigns: CampaignRow[];
  onNavigate: (s: Section) => void;
}) {
  const pendingTeams = teams.filter((t) => t.approvalStatus === 'PENDING_APPROVAL').slice(0, 4);
  const unverifiedCampaigns = campaigns.filter((c) => !c.verified).slice(0, 4);

  const recentActivity = useMemo(() => {
    const teamEvents = teams.slice(0, 6).map((t) => ({
      id: `team-${t.id}`,
      title: t.name,
      subtitle: `Organisation submitted by ${t.ownerName}`,
      date: t.submittedAt,
      icon: Building2,
      status: t.approvalStatus,
    }));
    const campaignEvents = campaigns.slice(0, 6).map((c) => ({
      id: `campaign-${c.id}`,
      title: c.title,
      subtitle: `Campaign by ${c.creatorName} · ${c.category}`,
      date: c.createdAt,
      icon: HeartHandshake,
      status: c.verified ? 'APPROVED' : 'PENDING_APPROVAL',
    }));
    return [...teamEvents, ...campaignEvents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [teams, campaigns]);

  return (
    <div className="space-y-6">
      {/* Hero ledger strip */}
      <div className="relative overflow-hidden rounded-3xl bg-ledger p-6 shadow-lg sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-fintech-mesh" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Total pooled funds</p>
            <p className="mt-2 font-figures text-3xl font-bold text-white sm:text-4xl">
              {formatKES(Math.round(stats.totalPooledFunds))}
            </p>
            <p className="mt-2 text-sm text-white/60">Across every chama loan account on the platform.</p>
          </div>
          <div className="flex flex-wrap gap-6 sm:gap-10">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-white/50">Users</p>
              <p className="font-figures text-xl font-bold text-white">{stats.totalUsers.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-white/50">Organisations</p>
              <p className="font-figures text-xl font-bold text-white">{stats.orgs.total.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-white/50">Campaigns raised</p>
              <p className="font-figures text-xl font-bold text-white">{formatKES(stats.campaigns.totalRaised)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending organisations"
          value={stats.orgs.pending}
          icon={Clock}
          tone="gold"
          hint="Awaiting your review"
        />
        <StatCard
          label="Approved organisations"
          value={stats.orgs.approved}
          icon={CheckCircle2}
          tone="chama"
          hint={`${stats.orgs.rejected} rejected all-time`}
        />
        <StatCard
          label="Unverified campaigns"
          value={stats.campaigns.unverified}
          icon={HeartHandshake}
          tone="destructive"
          hint={`${stats.campaigns.active} currently active`}
        />
        <StatCard
          label="Active investment products"
          value={stats.products.active}
          icon={PiggyBank}
          tone="primary"
          hint={`${stats.products.inactive} inactive`}
        />
      </div>

      {/* Chart + attention panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Organisation submissions</CardTitle>
            <CardDescription>New chamas submitted for approval, last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <MiniBarChart data={stats.monthlyOrgSubmissions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Needs attention</CardTitle>
              <CardDescription>Quick jumps to pending items</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingTeams.length === 0 && unverifiedCampaigns.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">All caught up. Nothing waiting on you.</p>
            )}
            {pendingTeams.map((t) => (
              <button
                key={t.id}
                onClick={() => onNavigate('organisations')}
                className="flex w-full items-center gap-3 rounded-xl border border-border/60 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="truncate text-xs text-muted-foreground">Organisation · needs review</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
            {unverifiedCampaigns.map((c) => (
              <button
                key={c.id}
                onClick={() => onNavigate('campaigns')}
                className="flex w-full items-center gap-3 rounded-xl border border-border/60 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <HeartHandshake className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <p className="truncate text-xs text-muted-foreground">Campaign · unverified</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>Latest organisations and campaigns submitted to the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {recentActivity.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={item.status === 'PENDING_APPROVAL' ? 'secondary' : item.status === 'REJECTED' ? 'destructive' : 'default'}>
                  {item.status === 'PENDING_APPROVAL' ? 'Pending' : item.status === 'REJECTED' ? 'Rejected' : 'Approved'}
                </Badge>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {new Date(item.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*                           ORGANISATIONS                          */
/* ────────────────────────────────────────────────────────────── */

type OrgFilter = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ALL';

function OrganisationsAdminSection({ teams }: { teams: TeamRow[] }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<OrgFilter>('PENDING_APPROVAL');
  const [query, setQuery] = useState('');
  const [rejectTarget, setRejectTarget] = useState<TeamRow | null>(null);

  const counts = {
    PENDING_APPROVAL: teams.filter((t) => t.approvalStatus === 'PENDING_APPROVAL').length,
    APPROVED: teams.filter((t) => t.approvalStatus === 'APPROVED').length,
    REJECTED: teams.filter((t) => t.approvalStatus === 'REJECTED').length,
    ALL: teams.length,
  };

  const filtered = teams.filter((t) => {
    if (filter !== 'ALL' && t.approvalStatus !== filter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.ownerName.toLowerCase().includes(q) || (t.ownerEmail ?? '').toLowerCase().includes(q);
  });

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
        setRejectTarget(null);
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <FilterPill active={filter === 'PENDING_APPROVAL'} onClick={() => setFilter('PENDING_APPROVAL')}>
            Pending ({counts.PENDING_APPROVAL})
          </FilterPill>
          <FilterPill active={filter === 'APPROVED'} onClick={() => setFilter('APPROVED')}>
            Approved ({counts.APPROVED})
          </FilterPill>
          <FilterPill active={filter === 'REJECTED'} onClick={() => setFilter('REJECTED')}>
            Rejected ({counts.REJECTED})
          </FilterPill>
          <FilterPill active={filter === 'ALL'} onClick={() => setFilter('ALL')}>
            All ({counts.ALL})
          </FilterPill>
        </div>
        <SearchBox value={query} onChange={setQuery} placeholder="Search organisations…" />
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No organisations match this view.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {filtered.map((t) => (
          <Card key={t.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    {t.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      {t.name}
                      {t.isDiaspora && <Badge variant="secondary">Diaspora Chama</Badge>}
                    </CardTitle>
                    <CardDescription>
                      {t.ownerName} {t.ownerEmail ? `· ${t.ownerEmail}` : ''} {t.ownerPhone ? `· ${t.ownerPhone}` : ''}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[t.approvalStatus]}>
                  {t.approvalStatus === 'PENDING_APPROVAL' ? 'Pending' : t.approvalStatus === 'APPROVED' ? 'Approved' : 'Rejected'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-muted/40 p-4 text-sm sm:grid-cols-4">
                <div><dt className="text-xs text-muted-foreground">Level</dt><dd className="font-medium">{t.levelName || '—'}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Registration No.</dt><dd className="font-medium">{t.businessRegNumber || '—'}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Members</dt><dd className="font-medium">{t.numberOfMembers ?? '—'}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Directors</dt><dd className="font-medium">{t.totalDirectors ?? '—'}</dd></div>
              </dl>

              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2"><dt className="text-muted-foreground">Address</dt><dd>{t.physicalAddress || '—'}</dd></div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Chama Objectives</dt>
                  <dd>{t.objectives.length > 0 ? t.objectives.map((o) => OBJECTIVE_LABELS[o] || o).join(', ') : '—'}</dd>
                </div>
                <div><dt className="text-muted-foreground">Members Running SMEs</dt><dd>{t.membersRunningSME ?? '—'}</dd></div>
                <div><dt className="text-muted-foreground">Members Employed</dt><dd>{t.membersEmployed ?? '—'}</dd></div>
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
                {t.approvalStatus === 'REJECTED' && t.rejectionReason && (
                  <div className="sm:col-span-2 rounded-lg bg-destructive/5 p-3">
                    <dt className="text-xs font-medium text-destructive">Rejection reason</dt>
                    <dd className="text-destructive/90">{t.rejectionReason}</dd>
                  </div>
                )}
              </dl>

              {t.approvalStatus === 'PENDING_APPROVAL' && (
                <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
                  <Button size="sm" onClick={() => handleApprove(t.id)} disabled={isPending} className="gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </Button>
                  <Dialog open={rejectTarget?.id === t.id} onOpenChange={(open) => !open && setRejectTarget(null)}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => setRejectTarget(t)} className="gap-1.5 text-destructive hover:text-destructive">
                        <XCircle className="h-4 w-4" /> Reject
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reject {t.name}?</DialogTitle>
                        <DialogDescription>Optionally tell the team leader why. This is visible to them.</DialogDescription>
                      </DialogHeader>
                      <Textarea
                        placeholder="Rejection reason (optional)"
                        value={reasonById[t.id] ?? ''}
                        onChange={(e) => setReasonById((p) => ({ ...p, [t.id]: e.target.value }))}
                      />
                      <DialogFooter>
                        <Button variant="destructive" onClick={() => handleReject(t.id)} disabled={isPending}>
                          {isPending ? 'Rejecting…' : 'Confirm rejection'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*                              CAMPAIGNS                           */
/* ────────────────────────────────────────────────────────────── */

type CampaignFilter = 'ALL' | 'UNVERIFIED' | 'VERIFIED' | 'CLOSED';

function CampaignsAdminSection({ campaigns }: { campaigns: CampaignRow[] }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<CampaignFilter>('ALL');
  const [query, setQuery] = useState('');

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

  const filtered = campaigns.filter((c) => {
    if (filter === 'UNVERIFIED' && c.verified) return false;
    if (filter === 'VERIFIED' && !c.verified) return false;
    if (filter === 'CLOSED' && c.status !== 'CLOSED') return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return c.title.toLowerCase().includes(q) || c.creatorName.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
  });

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">No campaigns yet.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <FilterPill active={filter === 'ALL'} onClick={() => setFilter('ALL')}>All ({campaigns.length})</FilterPill>
          <FilterPill active={filter === 'UNVERIFIED'} onClick={() => setFilter('UNVERIFIED')}>
            Unverified ({campaigns.filter((c) => !c.verified).length})
          </FilterPill>
          <FilterPill active={filter === 'VERIFIED'} onClick={() => setFilter('VERIFIED')}>
            Verified ({campaigns.filter((c) => c.verified).length})
          </FilterPill>
          <FilterPill active={filter === 'CLOSED'} onClick={() => setFilter('CLOSED')}>
            Closed ({campaigns.filter((c) => c.status === 'CLOSED').length})
          </FilterPill>
        </div>
        <SearchBox value={query} onChange={setQuery} placeholder="Search campaigns…" />
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="max-w-[220px]">
                  <p className="truncate font-medium">{c.title}</p>
                  <p className="truncate text-xs text-muted-foreground">by {c.creatorName}</p>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline">{c.category}</Badge>
                </TableCell>
                <TableCell className="min-w-[160px]">
                  <p className="font-figures text-xs font-medium">
                    {formatKES(c.raisedAmount)} <span className="text-muted-foreground">/ {formatKES(c.targetAmount)}</span>
                  </p>
                  <ProgressBar value={c.raisedAmount} max={c.targetAmount} className="mt-1.5" />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="flex flex-wrap gap-1.5">
                    {c.status === 'CLOSED' && <Badge variant="destructive">Closed</Badge>}
                    {c.verified ? <Badge>Verified</Badge> : <Badge variant="secondary">Unverified</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {c.verified ? (
                    <Button size="sm" variant="outline" onClick={() => handleUnverify(c.id)} disabled={isPending}>
                      Unverify
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => handleVerify(c.id)} disabled={isPending}>
                      Verify
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No campaigns match this view.</p>}
      </Card>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*                        INVESTMENT PRODUCTS                       */
/* ────────────────────────────────────────────────────────────── */

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

const PRODUCT_TONE: Record<ProductType, string> = {
  MMF: 'bg-primary/10 text-primary',
  STOCK: 'bg-gold/15 text-gold',
  BOND: 'bg-chama/10 text-chama',
  FIXED_DEPOSIT: 'bg-destructive/10 text-destructive',
  SAVINGS: 'bg-primary/10 text-primary',
  JUNIOR: 'bg-chama/10 text-chama',
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          The product catalog chamas invest their pooled fund into from /invest.
        </p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Investment Product</DialogTitle></DialogHeader>
            {formFields}
            <DialogFooter>
              <Button onClick={handleCreate} disabled={isPending}>{isPending ? 'Creating…' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {products.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">No products yet.</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => (
          <Card key={p.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', PRODUCT_TONE[p.type])}>
                  <PiggyBank className="h-5 w-5" />
                </div>
                <Badge variant={p.isActive ? 'default' : 'secondary'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <CardTitle className="text-base">{p.name}</CardTitle>
              <CardDescription>{TYPE_LABEL[p.type]}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-4">
              <div className="space-y-2 rounded-xl bg-muted/40 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Return</span>
                  <span className="font-figures font-semibold text-chama">
                    {p.roiMax ? `${p.roi}–${p.roiMax}` : p.roi}% p.a.
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Term</span>
                  <span className="font-figures font-medium">{p.duration} mo</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Range</span>
                  <span className="font-figures font-medium">
                    {formatKES(p.minAmount)}{p.maxAmount ? ` – ${formatKES(p.maxAmount)}` : '+'}
                  </span>
                </div>
              </div>
              {p.description && <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => openEdit(p)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => handleToggle(p.id)} disabled={isPending}>
                  <Power className="h-3.5 w-3.5" /> {p.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit {editing?.name}</DialogTitle></DialogHeader>
          {formFields}
          <DialogFooter>
            <Button onClick={handleUpdate} disabled={isPending}>{isPending ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*                           MEMBER REPORTS                         */
/* ────────────────────────────────────────────────────────────── */

function MemberReportsAdminSection({ reports }: { reports: ReportRow[] }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [csv, setCsv] = useState('');
  const [query, setQuery] = useState('');

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

  const filtered = reports.filter((r) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (r.memberName ?? '').toLowerCase().includes(q) ||
      r.memberEmail.toLowerCase().includes(q) ||
      (r.teamName ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Sync from Google Sheets</CardTitle>
              <CardDescription>
                Paste a CSV export (header row required: <code>email,name,date,principal,rate,roi,withdrawal,closingBalance,period,notes</code>).
                For automatic syncing, point a Google Sheets Apps Script trigger at <code>/api/member-reports/sync</code> instead — same
                column names, sent as JSON.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={6}
            placeholder="email,name,date,principal,rate,roi,withdrawal,closingBalance,period,notes"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            className="font-figures"
          />
          <Button onClick={handleSync} disabled={isPending || !csv.trim()} className="gap-1.5">
            <UploadCloud className="h-4 w-4" /> {isPending ? 'Syncing…' : 'Sync Rows'}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-headline text-lg font-semibold">Recent Rows ({reports.length})</h2>
          <SearchBox value={query} onChange={setQuery} placeholder="Search member, chama, email…" />
        </div>

        {reports.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No member reports synced yet.</CardContent></Card>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead className="hidden sm:table-cell">Chama</TableHead>
                  <TableHead className="hidden md:table-cell">Period</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead className="hidden lg:table-cell">ROI</TableHead>
                  <TableHead>Closing Bal.</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-[180px]">
                      <p className="truncate font-medium">{r.memberName || r.memberEmail}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.memberEmail}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {r.teamName ? r.teamName : <span className="text-xs text-muted-foreground">Unmatched</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {r.periodLabel || r.date || '—'}
                    </TableCell>
                    <TableCell className="font-figures text-sm">{r.principal || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell font-figures text-sm">{r.roi || '—'}</TableCell>
                    <TableCell className="font-figures text-sm">{r.closingBal || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No rows match your search.</p>}
          </Card>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*                              PAYMENTS                            */
/* ────────────────────────────────────────────────────────────── */

type PaymentFilter = 'PENDING' | 'SUCCESS' | 'FAILED' | 'ALL';

const PAYMENT_STATUS_VARIANT: Record<PaymentRow['status'], 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  SUCCESS: 'default',
  FAILED: 'destructive',
  CANCELLED: 'destructive',
};

function PaymentsAdminSection({ payments }: { payments: PaymentRow[] }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<PaymentFilter>('PENDING');
  const [query, setQuery] = useState('');
  const [noteById, setNoteById] = useState<Record<string, string>>({});

  const counts = {
    PENDING: payments.filter((p) => p.status === 'PENDING').length,
    SUCCESS: payments.filter((p) => p.status === 'SUCCESS').length,
    FAILED: payments.filter((p) => p.status === 'FAILED' || p.status === 'CANCELLED').length,
    ALL: payments.length,
  };

  const filtered = payments.filter((p) => {
    if (filter === 'PENDING' && p.status !== 'PENDING') return false;
    if (filter === 'SUCCESS' && p.status !== 'SUCCESS') return false;
    if (filter === 'FAILED' && !(p.status === 'FAILED' || p.status === 'CANCELLED')) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return p.memberName.toLowerCase().includes(q) || p.productName.toLowerCase().includes(q) || (p.phone ?? '').includes(q);
  });

  const handleResolve = (id: string, status: 'SUCCESS' | 'FAILED') => {
    startTransition(async () => {
      try {
        await resolvePayment(id, status, noteById[id]);
        toast({ title: status === 'SUCCESS' ? 'Payment confirmed & credited' : 'Payment marked failed' });
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No payment requests yet. They'll show up here once a member pays via M-Pesa or Visa card from /accounts.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm text-muted-foreground">
        No live payment gateway is connected yet — confirm M-Pesa/Visa requests here once you've verified the
        money landed, and it'll be credited to the member's account balance automatically.
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <FilterPill active={filter === 'PENDING'} onClick={() => setFilter('PENDING')}>
            Pending ({counts.PENDING})
          </FilterPill>
          <FilterPill active={filter === 'SUCCESS'} onClick={() => setFilter('SUCCESS')}>
            Confirmed ({counts.SUCCESS})
          </FilterPill>
          <FilterPill active={filter === 'FAILED'} onClick={() => setFilter('FAILED')}>
            Failed ({counts.FAILED})
          </FilterPill>
          <FilterPill active={filter === 'ALL'} onClick={() => setFilter('ALL')}>
            All ({counts.ALL})
          </FilterPill>
        </div>
        <SearchBox value={query} onChange={setQuery} placeholder="Search member, account, phone…" />
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead className="hidden sm:table-cell">Account</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="max-w-[160px]">
                  <p className="truncate font-medium">{p.memberName}</p>
                  {p.phone && <p className="truncate text-xs text-muted-foreground">{p.phone}</p>}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm">{p.productName}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    {p.channel === 'MPESA' ? (
                      <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    {p.channel === 'MPESA' ? 'M-Pesa' : 'Visa Card'}
                  </span>
                </TableCell>
                <TableCell className="font-figures">{formatKES(p.amount)}</TableCell>
                <TableCell>
                  <Badge variant={PAYMENT_STATUS_VARIANT[p.status]}>{p.status}</Badge>
                  {p.note && <p className="mt-1 text-xs text-muted-foreground">{p.note}</p>}
                </TableCell>
                <TableCell className="text-right">
                  {p.status === 'PENDING' ? (
                    <div className="flex flex-col items-end gap-1.5">
                      <Input
                        placeholder="Note (optional)"
                        value={noteById[p.id] ?? ''}
                        onChange={(e) => setNoteById((n) => ({ ...n, [p.id]: e.target.value }))}
                        className="h-8 w-40 text-xs"
                      />
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => handleResolve(p.id, 'FAILED')} disabled={isPending}>
                          <XCircle className="h-3 w-3" /> Failed
                        </Button>
                        <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => handleResolve(p.id, 'SUCCESS')} disabled={isPending}>
                          <CheckCircle2 className="h-3 w-3" /> Confirm
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No payments match this view.</p>}
      </Card>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*                       JUNIOR ACCOUNT APPLICATIONS                */
/* ────────────────────────────────────────────────────────────── */

type JuniorFilter = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ALL';

function JuniorAdminSection({ applications }: { applications: JuniorApplicationRow[] }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<JuniorFilter>('PENDING_REVIEW');
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ url: string; label: string } | null>(null);

  const counts = {
    PENDING_REVIEW: applications.filter((a) => a.status === 'PENDING_REVIEW').length,
    APPROVED: applications.filter((a) => a.status === 'APPROVED').length,
    REJECTED: applications.filter((a) => a.status === 'REJECTED').length,
    ALL: applications.length,
  };

  const filtered = filter === 'ALL' ? applications : applications.filter((a) => a.status === filter);

  const handleDecide = (id: string, decision: 'APPROVED' | 'REJECTED') => {
    startTransition(async () => {
      try {
        await decideJuniorApplication(id, decision, noteById[id]);
        toast({ title: decision === 'APPROVED' ? 'Junior Account approved' : 'Application rejected' });
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No Junior Account applications yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FilterPill active={filter === 'PENDING_REVIEW'} onClick={() => setFilter('PENDING_REVIEW')}>
          Pending review ({counts.PENDING_REVIEW})
        </FilterPill>
        <FilterPill active={filter === 'APPROVED'} onClick={() => setFilter('APPROVED')}>
          Approved ({counts.APPROVED})
        </FilterPill>
        <FilterPill active={filter === 'REJECTED'} onClick={() => setFilter('REJECTED')}>
          Rejected ({counts.REJECTED})
        </FilterPill>
        <FilterPill active={filter === 'ALL'} onClick={() => setFilter('ALL')}>
          All ({counts.ALL})
        </FilterPill>
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No applications match this view.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {filtered.map((a) => {
          const birthCertUrl = `data:${a.birthCertMimeType};base64,${a.birthCertData}`;
          const childPhotoUrl = `data:${a.childPhotoMimeType};base64,${a.childPhotoData}`;
          const isImageCert = a.birthCertMimeType.startsWith('image/');

          return (
            <Card key={a.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-chama/10 text-chama">
                      <Baby className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{a.childFullName}</CardTitle>
                      <CardDescription>
                        Guardian: {a.guardianName} · {a.guardianPhone}
                        {a.childDateOfBirth && ` · DOB ${new Date(a.childDateOfBirth).toLocaleDateString()}`}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={a.status === 'APPROVED' ? 'default' : a.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                    {a.status === 'PENDING_REVIEW' ? 'Pending review' : a.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 rounded-xl bg-muted/40 p-4 text-sm sm:grid-cols-3">
                  <div><dt className="text-xs text-muted-foreground">Guardian ID/Passport</dt><dd className="font-medium">{a.guardianIdNumber}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Guardian Phone</dt><dd className="font-medium">{a.guardianPhone}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Guardian KRA PIN</dt><dd className="font-medium">{a.guardianKraPin}</dd></div>
                </dl>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setPreview({ url: birthCertUrl, label: `${a.childFullName} — Birth Certificate` })}
                    className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    {isImageCert ? <ImageIcon className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                    {a.birthCertFileName}
                  </button>
                  <button
                    onClick={() => setPreview({ url: childPhotoUrl, label: `${a.childFullName} — Passport Photo` })}
                    className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    {a.childPhotoFileName}
                  </button>
                </div>

                {a.reviewNotes && (
                  <div className="rounded-lg bg-muted/40 p-3 text-sm">
                    <p className="text-xs font-medium text-muted-foreground">Review note</p>
                    <p>{a.reviewNotes}</p>
                  </div>
                )}

                {a.status === 'PENDING_REVIEW' && (
                  <div className="space-y-2 border-t border-border/60 pt-4">
                    <Textarea
                      placeholder="Note for the guardian (optional, shown if rejected)"
                      value={noteById[a.id] ?? ''}
                      onChange={(e) => setNoteById((n) => ({ ...n, [a.id]: e.target.value }))}
                      rows={2}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => handleDecide(a.id, 'APPROVED')} disabled={isPending} className="gap-1.5">
                        <CheckCircle2 className="h-4 w-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecide(a.id, 'REJECTED')}
                        disabled={isPending}
                        className="gap-1.5 text-destructive hover:text-destructive"
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{preview?.label}</DialogTitle>
          </DialogHeader>
          {preview && (
            preview.url.startsWith('data:application/pdf') ? (
              <a href={preview.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline">
                Open PDF in a new tab
              </a>
            ) : (
              <img src={preview.url} alt={preview.label} className="max-h-[70vh] w-full rounded-lg object-contain" />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
