import { HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'How do I start a chama?',
    a: "Go to \"Apply to Start a Chama\" in the sidebar and submit your organisation's details. An admin reviews every application before it goes live.",
  },
  {
    q: 'How do members join my chama?',
    a: 'Once your organisation is approved, open Dashboard → Members and use "Add Member" to invite people by email.',
  },
  {
    q: 'How does the loan account work?',
    a: 'The Team Leader funds a shared loan account. Any member can request a loan against it; two fellow members must guarantee the request before the Team Leader approves it.',
  },
  {
    q: 'How are loan repayments tracked?',
    a: 'Once a loan is approved, a weekly repayment schedule is generated automatically. The Team Leader marks each week as paid from the Loan Requests tab.',
  },
  {
    q: 'Who can remove a member or edit the chama?',
    a: 'Only the Team Leader. Every other member has full visibility but cannot edit membership or chama details.',
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Help Center</h1>
        <p className="text-muted-foreground">Answers to common questions about L-CHAMA.</p>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" /> Frequently asked questions
          </CardTitle>
          <CardDescription>Still stuck? Reach out to your Team Leader or platform admin.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {FAQS.map((item) => (
            <div key={item.q} className="py-4 first:pt-0 last:pb-0">
              <p className="font-medium">{item.q}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
