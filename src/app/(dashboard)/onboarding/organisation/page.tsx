import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getChamaContext } from '@/lib/chama';
import { OrganisationClient } from './OrganisationClient';

export default async function OrganisationPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in?redirect_url=/onboarding/organisation');

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) redirect('/onboarding/profile');
  if (!user.profileCompleted) redirect('/onboarding/profile');

  const ctx = await getChamaContext(user);
  if (ctx) {
    redirect('/onboarding/pending');
  }

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="font-headline text-2xl sm:text-3xl font-bold">Register Organisation</h1>
        <p className="mt-2 text-muted-foreground">Fill in your organization details below</p>
      </div>
      <OrganisationClient />
    </div>
  );
}
