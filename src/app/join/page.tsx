import Link from 'next/link';
import { MarketingShell, PageIntro } from '@/components/MarketingShell';
import { JoinForm } from './JoinForm';

export const metadata = {
  title: 'Join My Chama | L-Chama',
  description: 'Join an existing chama with the invite link from your chama officials.',
};

export default function JoinPage() {
  return (
    <MarketingShell>
      <PageIntro title="Join my chama">
        Chamas are joined by invitation. Paste the invite link your chama official sent you and we&apos;ll take
        you to your group.
      </PageIntro>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 space-y-8">
          <JoinForm />
          <div className="max-w-xl text-sm text-muted-foreground space-y-2">
            <p>
              Don&apos;t have a link? Ask your chama&apos;s Team Leader, Secretary or Treasurer to send you one
              from their dashboard.
            </p>
            <p>
              Want to create a group instead?{' '}
              <Link href="/start" className="underline hover:text-primary">Start a chama</Link>. Already a
              member? <Link href="/sign-in" className="underline hover:text-primary">Sign in</Link>.
            </p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
