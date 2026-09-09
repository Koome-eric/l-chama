import { redirect, notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getChamaContext } from '@/lib/chama';
import { LoanFormDocument } from '../LoanFormDocument';

export default async function LoanRequestFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect(`/sign-in?redirect_url=/panel/loan-form/${id}`);

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) redirect('/onboarding/profile');

  const ctx = await getChamaContext(user);
  if (!ctx) redirect('/onboarding/organisation');

  const request = await prisma.loanRequest.findUnique({
    where: { id },
    include: { requester: true, guarantees: { include: { guarantor: true } } },
  });

  if (!request || request.teamId !== ctx.team.id) notFound();

  const totalRepayable = Math.round(request.amount * (1 + request.interestRate / 100));

  return (
    <LoanFormDocument
      data={{
        chamaName: ctx.team.name,
        requesterName: request.requester.fullName || undefined,
        requesterEmail: request.requester.email || undefined,
        amount: request.amount,
        purpose: request.purpose || undefined,
        months: request.months || undefined,
        interestRate: request.interestRate,
        processingFee: request.processingFee,
        repaymentWeeks: request.repaymentWeeks || undefined,
        totalRepayable,
        date: new Date(request.createdAt).toLocaleDateString(),
        guarantors: request.guarantees.map((g) => ({
          name: g.guarantor.fullName || g.guarantor.email || 'Unknown member',
          signatureName: g.signatureName,
          signedAt: g.createdAt.toISOString(),
        })),
      }}
    />
  );
}
