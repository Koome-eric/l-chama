import LChamaHeader from '@/components/LChamaHeader';
import LChamaFooter from '@/components/LChamaFooter';

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LChamaHeader />
      <main className="flex-1">{children}</main>
      <LChamaFooter />
    </div>
  );
}

export function PageIntro({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="bg-fintech-mesh border-b border-border/60 py-14 md:py-20">
      <div className="container mx-auto px-4">
        <h1 className="font-headline text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
        {children && <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{children}</p>}
      </div>
    </section>
  );
}
