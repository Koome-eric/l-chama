import { prisma } from '@/lib/prisma';
import LChamaHeader from '@/components/LChamaHeader';
import LChamaFooter from '@/components/LChamaFooter';
import { ChamaInviteAcceptClient } from './InviteAcceptClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react';

export default async function ChamaInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invite = await prisma.teamInvite.findUnique({
    where: { token },
    include: { team: true, invitedBy: true },
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LChamaHeader />
      <main className="flex-1 flex items-center justify-center p-4">
        {!invite ? (
          <InvalidInvite reason="This invite link is invalid." />
        ) : invite.status === 'ACCEPTED' ? (
          <InvalidInvite reason="This invite has already been accepted. Sign in to access your chama." showSignIn />
        ) : invite.status === 'REVOKED' ? (
          <InvalidInvite reason="This invite has been revoked by the Team Leader." />
        ) : invite.status === 'EXPIRED' || invite.expiresAt < new Date() ? (
          <InvalidInvite reason="This invite has expired. Ask the Team Leader to send you a new one." />
        ) : (
          <ChamaInviteAcceptClient
            token={token}
            teamName={invite.team.name}
            invitedByName={invite.invitedBy.fullName || invite.invitedBy.email || 'Team leader'}
            email={invite.email}
          />
        )}
      </main>
      <LChamaFooter />
    </div>
  );
}

function InvalidInvite({ reason, showSignIn }: { reason: string; showSignIn?: boolean }) {
  return (
    <Card className="max-w-md w-full rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <XCircle className="h-5 w-5" /> Invite Unavailable
        </CardTitle>
        <CardDescription>{reason}</CardDescription>
      </CardHeader>
      {showSignIn && (
        <CardContent>
          <a href="/sign-in" className="text-primary underline text-sm">
            Go to sign in
          </a>
        </CardContent>
      )}
    </Card>
  );
}
