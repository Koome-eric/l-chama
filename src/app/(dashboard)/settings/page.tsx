import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon, User } from 'lucide-react';

export default async function SettingsPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in?redirect_url=/settings');

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) redirect('/onboarding/profile');

  const rows: Array<[string, string]> = [
    ['Full name', user.fullName || '—'],
    ['Email', user.email || '—'],
    ['Phone', user.phone || '—'],
    ['ID number', user.idNumber || '—'],
    ['Country', user.country || '—'],
    ['Region', user.region || '—'],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Your account details.</p>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Profile
          </CardTitle>
          <CardDescription>
            Use the account menu in the top-right corner to update your name, email, or password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-2.5 text-sm">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" /> More settings
          </CardTitle>
          <CardDescription>
            Notification preferences and other app settings are on the way.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
