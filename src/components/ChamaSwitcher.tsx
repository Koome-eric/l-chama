'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { setActiveChama } from '@/app/(dashboard)/active-chama-actions';

export type SwitcherChama = {
  id: string;
  name: string;
  ludevaNumber: string | null;
  isOwner: boolean;
  approvalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
};

// Sidebar control for people in more than one chama. A person in a single
// chama sees just its name and Ludeva Number (no dropdown needed), with a
// link to start another.
export function ChamaSwitcher({ chamas, activeId }: { chamas: SwitcherChama[]; activeId: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  if (chamas.length === 0) return null;

  const onChange = (id: string) => {
    if (id === activeId) return;
    startTransition(async () => {
      const res = await setActiveChama(id);
      if (!res.ok) {
        toast({ title: "Couldn't switch chama", description: res.error, variant: 'destructive' });
        return;
      }
      router.push('/panel');
      router.refresh();
    });
  };

  const label = (c: SwitcherChama) => (c.ludevaNumber ? `${c.name} · ${c.ludevaNumber}` : c.name);

  return (
    <div className="px-2 pb-2 space-y-1.5 group-data-[collapsible=icon]:hidden">
      <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {chamas.length > 1 ? 'Your chamas' : 'Your chama'}
      </p>
      {chamas.length > 1 ? (
        <Select value={activeId ?? undefined} onValueChange={onChange} disabled={isPending}>
          <SelectTrigger className="h-auto min-h-9 py-1.5 text-left" aria-label="Switch chama">
            <SelectValue placeholder="Choose a chama" />
          </SelectTrigger>
          <SelectContent>
            {chamas.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="block">{label(c)}</span>
                <span className="block text-xs text-muted-foreground">
                  {c.isOwner ? 'Admin' : 'Member'}
                  {c.approvalStatus === 'PENDING_APPROVAL' ? ' · pending approval' : ''}
                  {c.approvalStatus === 'REJECTED' ? ' · not approved' : ''}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="rounded-md border px-3 py-2 text-sm">
          <span className="block font-medium leading-tight">{chamas[0].name}</span>
          {chamas[0].ludevaNumber && (
            <span className="block text-xs text-muted-foreground">Admin Ludeva No. {chamas[0].ludevaNumber}</span>
          )}
        </div>
      )}
      <Link
        href="/onboarding/organisation?new=1"
        className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" /> Register another chama
      </Link>
    </div>
  );
}
