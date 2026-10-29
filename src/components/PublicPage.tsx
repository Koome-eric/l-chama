import Image from 'next/image';
import LChamaHeader from '@/components/LChamaHeader';
import LChamaFooter from '@/components/LChamaFooter';

// Shared frame for the public information pages (/products, /loans,
// /diaspora, /terms): the same header and footer as the landing page and a
// plain title band, so detail pages feel like one site.
export function PublicPage({
  title,
  intro,
  meta,
  art,
  children,
}: {
  title: string;
  intro: string;
  meta?: string;
  /** Optional decorative illustration shown beside the title on wide screens. */
  art?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LChamaHeader />
      <main className="flex-1">
        <div className="border-b bg-fintech-mesh">
          <div className="container mx-auto max-w-5xl px-4 py-14 md:py-20">
            <div className={art ? 'grid items-center gap-10 md:grid-cols-[1.2fr_0.8fr]' : ''}>
              <div>
                <h1 className="font-headline text-4xl md:text-5xl font-bold leading-tight">{title}</h1>
                <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{intro}</p>
                {meta && <p className="mt-3 text-sm text-muted-foreground">{meta}</p>}
              </div>
              {art && (
                <Image
                  src={art}
                  alt=""
                  aria-hidden="true"
                  width={520}
                  height={380}
                  className="hidden h-auto w-full max-w-sm justify-self-end md:block"
                />
              )}
            </div>
          </div>
        </div>
        <div className="container mx-auto max-w-5xl px-4 py-12 md:py-16">{children}</div>
      </main>
      <LChamaFooter />
    </div>
  );
}
