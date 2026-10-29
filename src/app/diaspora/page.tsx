import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { PublicPage } from '@/components/PublicPage';
import { Button } from '@/components/ui/button';
import { DIASPORA } from '@/lib/landing-content';

export const metadata = { title: 'Chamas for the diaspora — L-Chama' };

export default function DiasporaPage() {
  return (
    <PublicPage
      title="Run your chama from anywhere"
      intro="Members in Dallas, Dubai, London and Nairobi can contribute, guarantee and vote on one shared, time-zone-friendly dashboard."
    >
      <Image
        src="/images/diaspora-map.svg"
        alt="World map with lines connecting Nairobi to London, Dubai, Dallas and Sydney"
        width={1200}
        height={620}
        priority
        className="mb-14 h-auto w-full rounded-3xl border"
      />
      <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
        {DIASPORA.map((d) => (
          <section key={d.title} className="border-t-2 border-primary pt-5">
            <h2 className="font-headline text-xl font-semibold">{d.title}</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{d.body}</p>
          </section>
        ))}
      </div>
      <div className="mt-14 flex flex-wrap items-center gap-4">
        <Button asChild size="lg">
          <Link href="/sign-up">Start a chama <ArrowRight /></Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/contact">Talk to a diaspora team lead</Link>
        </Button>
      </div>
    </PublicPage>
  );
}
