import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import LChamaHeader from '@/components/LChamaHeader';
import LChamaFooter from '@/components/LChamaFooter';
import { ProfileClient } from './ProfileClient';

export default async function ProfilePage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in?redirect_url=/onboarding/profile');

  const user = await prisma.user.findUnique({ where: { clerkId } });

  if (user?.profileCompleted) {
    redirect('/onboarding/organisation');
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LChamaHeader />
      <main className="flex-1 container mx-auto px-4">
        <div className="py-12 max-w-xl mx-auto">
          <div className="mb-8">
            <h1 className="font-headline text-2xl sm:text-3xl font-bold">Complete Profile</h1>
            <p className="mt-2 text-muted-foreground">Tell us about yourself</p>
          </div>
          <ProfileClient defaultEmail={user?.email ?? undefined} />
        </div>
      </main>
      <LChamaFooter />
    </div>
  );
}
