'use client';

import { useState, useTransition } from 'react';
import { useUser, SignIn, SignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, IdCard, Phone } from 'lucide-react';
import { acceptChamaInvite } from './actions';
import { useToast } from '@/hooks/use-toast';

export function ChamaInviteAcceptClient({
  token,
  teamName,
  invitedByName,
  email,
  existingIdNumber = '',
  existingPhone = '',
}: {
  token: string;
  teamName: string;
  invitedByName: string;
  email: string;
  existingIdNumber?: string;
  existingPhone?: string;
}) {
  const { isSignedIn, isLoaded, user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [idNumber, setIdNumber] = useState(existingIdNumber);
  const [phone, setPhone] = useState(existingPhone);

  const returnUrl = `/invite/${token}`;
  const canAccept = idNumber.trim().length >= 4 && phone.trim().length >= 7;

  const handleAccept = () => {
    setError(null);
    startTransition(async () => {
      try {
        await acceptChamaInvite(token, { idNumber, phone });
        toast({ title: 'Welcome to the chama!', description: `You now have access to ${teamName}'s dashboard.` });
        router.replace('/panel');
      } catch (err: any) {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    });
  };

  if (!isLoaded) {
    return (
      <Card className="max-w-md w-full rounded-2xl shadow-sm">
        <CardContent className="py-10 text-center text-muted-foreground">Loading…</CardContent>
      </Card>
    );
  }

  if (isSignedIn && user) {
    const currentEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress;
    const emailMismatch = currentEmail?.toLowerCase() !== email.toLowerCase();

    return (
      <Card className="max-w-md w-full rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Join {teamName}
          </CardTitle>
          <CardDescription>
            {invitedByName} invited you ({email}) to join their chama on L-CHAMA. Once you accept,
            you'll get access to the shared dashboard and loan account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailMismatch ? (
            <p className="text-sm text-destructive">
              This invite was sent to <strong>{email}</strong>, but you're signed in as {currentEmail}.
              Please sign out and sign in with the invited email address.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Just a couple more details to finish setting up your membership.
              </p>
              <div>
                <Label htmlFor="invite-idNumber" className="flex items-center gap-1.5">
                  <IdCard className="h-3.5 w-3.5" /> ID / Passport Number
                </Label>
                <Input
                  id="invite-idNumber"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="e.g. 30112233"
                />
              </div>
              <div>
                <Label htmlFor="invite-phone" className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Phone Number
                </Label>
                <Input
                  id="invite-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XX XXX XXX"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          {!emailMismatch && (
            <Button onClick={handleAccept} disabled={isPending || !canAccept} className="w-full">
              {isPending ? 'Joining...' : 'Accept & Join Chama'}
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-md space-y-4">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Join {teamName}
          </CardTitle>
          <CardDescription>
            {invitedByName} invited <strong>{email}</strong> to join their chama. Sign in or create an
            account with that email to accept.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="sign-up" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sign-up">Create Account</TabsTrigger>
          <TabsTrigger value="sign-in">Sign In</TabsTrigger>
        </TabsList>
        <TabsContent value="sign-up" className="flex justify-center">
          <SignUp
            routing="hash"
            initialValues={{ emailAddress: email }}
            fallbackRedirectUrl={returnUrl}
            forceRedirectUrl={returnUrl}
          />
        </TabsContent>
        <TabsContent value="sign-in" className="flex justify-center">
          <SignIn
            routing="hash"
            initialValues={{ emailAddress: email }}
            fallbackRedirectUrl={returnUrl}
            forceRedirectUrl={returnUrl}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
