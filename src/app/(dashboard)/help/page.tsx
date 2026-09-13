import Link from 'next/link';
import { HelpCircle, LifeBuoy, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
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
            <LifeBuoy className="h-5 w-5 text-primary" /> Helpline
          </CardTitle>
          <CardDescription>Reach the L-Chama team directly for anything the FAQs below don't cover.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <a
            href="mailto:lchama@ludevaplc.co.ke"
            className="flex items-center gap-3 py-3 first:pt-0 hover:text-primary transition-colors"
          >
            <Mail className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="font-medium">Email</p>
              <p className="text-sm text-muted-foreground">lchama@ludevaplc.co.ke</p>
            </div>
          </a>
          <a
            href="mailto:kodemba@ludevaplc.co.ke"
            className="flex items-center gap-3 py-3 hover:text-primary transition-colors"
          >
            <UserRound className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="font-medium">L-Chama Director — Dr Keziah Odemba</p>
              <p className="text-sm text-muted-foreground">kodemba@ludevaplc.co.ke</p>
            </div>
          </a>
          <a href="tel:+254733799640" className="flex items-center gap-3 py-3 last:pb-0 hover:text-primary transition-colors">
            <Phone className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="font-medium">Phone</p>
              <p className="text-sm text-muted-foreground">0733 799 640</p>
            </div>
          </a>
        </CardContent>
      </Card>

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

      <Link
        href="/privacy"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ShieldCheck className="h-4 w-4" /> Read our Privacy Policy
      </Link>
    </div>
  );
}
