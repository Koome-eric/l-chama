'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { closeCampaign } from '../actions';

export function CloseCampaignButton({ campaignId }: { campaignId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    if (!confirm('Close this campaign? It will stop accepting donations.')) return;
    startTransition(async () => {
      try {
        await closeCampaign(campaignId);
        toast({ title: 'Campaign closed' });
        router.refresh();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <Button variant="outline" onClick={handleClose} disabled={isPending}>
      {isPending ? 'Closing…' : 'Close Campaign'}
    </Button>
  );
}
