import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getChamaContext } from '@/lib/chama';
import { LoanFormDocument } from './LoanFormDocument';

export default async function BlankLoanFormPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in?redirect_url=/panel/loan-form');

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) redirect('/onboarding/profile');

  const ctx = await getChamaContext(user);
  if (!ctx) redirect('/onboarding/organisation');

  return (
    <LoanFormDocument
      blank
      data={{ chamaName: ctx.team.name, date: new Date().toLocaleDateString() }}
    />
  );
}
