import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getChamaContext } from '@/lib/chama';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, XCircle } from 'lucide-react';

export default async function PendingApprovalPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in?redirect_url=/onboarding/pending');

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user || !user.profileCompleted) redirect('/onboarding/profile');

  const ctx = await getChamaContext(user);
  if (!ctx) redirect('/onboarding/organisation');

  // Members riding on an owner's already-approved chama, or an approved
  // owner, both belong in the panel — this page is only for an owner
  // whose own organisation is still pending or was rejected.
  if (ctx.team.owner.id !== user.id || ctx.team.approvalStatus === 'APPROVED') {
    redirect('/panel');
  }

  const status = ctx.team.approvalStatus;
  const rejectionReason = ctx.team.rejectionReason;

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="max-w-md w-full rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'REJECTED' ? (
              <>
                <XCircle className="h-5 w-5 text-destructive" /> Organisation Not Approved
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-primary" /> Awaiting Approval
              </>
            )}
          </CardTitle>
          <CardDescription>
            {status === 'REJECTED'
              ? 'Your organisation registration was not approved.'
              : `${ctx.team.name} has been submitted and is waiting for an admin to review it. We'll notify you once it's approved.`}
          </CardDescription>
        </CardHeader>
        {status === 'REJECTED' && rejectionReason && (
          <CardContent>
            <p className="text-sm text-muted-foreground">Reason: {rejectionReason}</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
