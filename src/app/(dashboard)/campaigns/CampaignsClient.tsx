'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Wallet,
  BadgeCheck,
  Users,
  Clock,
  MapPin,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { formatKES } from '@/lib/chama-levels';
import { daysLeft, progressPct } from '@/lib/campaigns';
import { donateToCampaign } from './actions';

type CampaignCard = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  targetAmount: number;
  raisedAmount: number;
  backersCount: number;
  verified: boolean;
  deadline: string;
  creatorName: string;
  donationCount: number;
};

type Stats = {
  activeCampaigns: number;
  totalRaised: number;
  verified: number;
  beneficiaries: number;
};

export function CampaignsClient({ campaigns, stats }: { campaigns: CampaignCard[]; stats: Stats }) {
  const [tab, setTab] = useState<'all' | 'trending'>('all');

  const visible = useMemo(() => {
    if (tab === 'all') return campaigns;
    return [...campaigns].sort((a, b) => b.backersCount - a.backersCount || b.raisedAmount - a.raisedAmount);
  }, [tab, campaigns]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Sparkles} label="Active Campaigns" value={stats.activeCampaigns.toString()} />
        <StatCard icon={Wallet} label="Total Raised" value={formatKES(stats.totalRaised)} accent="gold" />
        <StatCard icon={BadgeCheck} label="Verified" value={stats.verified.toString()} />
        <StatCard icon={Users} label="Beneficiaries" value={stats.beneficiaries.toLocaleString()} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'trending')}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
        </TabsList>
      </Tabs>

      {visible.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center text-muted-foreground">
            No campaigns yet — be the first to start one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visible.map((c) => (
            <CampaignCardView key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: 'gold';
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5 flex items-center gap-3">
        <div
          className={
            accent === 'gold'
              ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold'
              : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'
          }
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold font-headline truncate">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CampaignCardView({ campaign }: { campaign: CampaignCard }) {
  const pct = progressPct(campaign.raisedAmount, campaign.targetAmount);
  const remaining = daysLeft(campaign.deadline);

  return (
    <Card className="rounded-2xl overflow-hidden flex flex-col">
      <div className="h-28 bg-gradient-to-br from-primary/15 via-primary/5 to-gold/10 flex items-center justify-between px-4">
        <Badge variant="secondary" className="bg-background/80">{campaign.category}</Badge>
        {campaign.verified && (
          <Badge className="gap-1 bg-primary text-primary-foreground">
            <BadgeCheck className="h-3 w-3" /> Verified
          </Badge>
        )}
      </div>
      <CardContent className="p-5 flex-1 flex flex-col gap-3">
        <div>
          <h3 className="font-headline font-semibold leading-snug line-clamp-2">{campaign.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{campaign.description}</p>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          by {campaign.creatorName} <span className="mx-1">·</span>
          <MapPin className="h-3 w-3" /> {campaign.location}
        </p>

        <div className="space-y-1.5">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gold rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold text-gold">{formatKES(campaign.raisedAmount)}</span>
            <span className="text-xs text-muted-foreground">of {formatKES(campaign.targetAmount)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {campaign.backersCount} backers
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {remaining} days left
          </span>
        </div>

        <div className="mt-auto pt-2 flex gap-2">
          <DonateDialog campaignId={campaign.id} campaignTitle={campaign.title} />
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/campaigns/${campaign.id}`}>View More</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DonateDialog({ campaignId, campaignTitle }: { campaignId: string; campaignTitle: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDonate = () => {
    const value = Number(amount);
    startTransition(async () => {
      try {
        await donateToCampaign({ campaignId, amount: value, message, anonymous });
        toast({ title: 'Thank you for your donation!', description: `${formatKES(value)} to ${campaignTitle}.` });
        setOpen(false);
        setAmount('');
        setMessage('');
        router.refresh();
      } catch (err: any) {
        toast({ title: 'Could not process donation', description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex-1">Donate</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Donate to {campaignTitle}</DialogTitle>
          <DialogDescription>Every contribution helps this campaign reach its goal.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="donateAmount">Amount (KES)</Label>
            <Input
              id="donateAmount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500"
            />
          </div>
          <div>
            <Label htmlFor="donateMessage">Message (optional)</Label>
            <Textarea
              id="donateMessage"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Leave a word of support"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Donate anonymously
          </label>
        </div>
        <DialogFooter>
          <Button onClick={handleDonate} disabled={isPending || !amount || Number(amount) <= 0}>
            {isPending ? 'Processing…' : 'Confirm Donation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
