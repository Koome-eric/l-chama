'use client';

import { useState, useTransition } from 'react';
import { ClipboardList } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GroupProfileFields } from '@/components/GroupProfileFields';
import { useToast } from '@/hooks/use-toast';
import { saveGroupProfile } from '@/app/(dashboard)/team/group-profile-actions';
import { isGroupProfileDraftComplete, type GroupProfileDraft } from '@/lib/group-profile';

// Team Leader's editable group KYC / market profile.
export function GroupProfileCard({ initial, complete }: { initial: GroupProfileDraft; complete: boolean }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<GroupProfileDraft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(!complete);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await saveGroupProfile(draft);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast({ title: 'Group profile saved' });
      setOpen(false);
    });
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5 text-primary" /> Group profile (KYC)
          </CardTitle>
          <Badge variant={complete ? 'secondary' : 'destructive'}>{complete ? 'Complete' : 'Needs your input'}</Badge>
        </div>
        <CardDescription>
          A few facts about your group — where it operates, how it saves and borrows today. It takes about two minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {open ? (
          <>
            <GroupProfileFields value={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button className="h-11 rounded-xl" onClick={save} disabled={isPending || !isGroupProfileDraftComplete(draft)}>
                {isPending ? 'Saving…' : 'Save group profile'}
              </Button>
              {complete && (
                <Button variant="outline" className="h-11 rounded-xl" onClick={() => setOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
              )}
            </div>
          </>
        ) : (
          <Button variant="outline" className="rounded-xl" onClick={() => setOpen(true)}>
            Review or update
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
