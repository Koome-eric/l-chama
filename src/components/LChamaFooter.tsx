import Link from 'next/link';
import Image from 'next/image';

const COLUMNS = [
  {
    title: 'Chama',
    links: [
      { label: 'Start a chama', href: '/start' },
      { label: 'Join my chama', href: '/join' },
      { label: 'Sign in', href: '/sign-in' },
      { label: 'Products and rates', href: '/products' },
      { label: 'Loans', href: '/loans' },
      { label: 'Fundraising', href: '/fundraising' },
      { label: 'Diaspora chamas', href: '/diaspora' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Questions', href: '/#faq' },
      { label: 'Contact', href: '/contact' },
      { label: 'Privacy policy', href: '/privacy' },
      { label: 'Terms of service', href: '/terms' },
    ],
  },
];

export default function LChamaFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 lg:px-6 py-12 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-xs">
          <Image src="/lchama-logo.png" alt="L-Chama by Ludeva" width={155} height={77} className="h-9 w-auto dark:hidden" />
          <Image src="/lchama-logo-dark.png" alt="L-Chama by Ludeva" width={155} height={77} className="hidden h-9 w-auto dark:block" />
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Group savings, guaranteed loans and a shared ledger for chamas in Kenya and the diaspora.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="font-headline font-semibold">{col.title}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t">
        <div className="container mx-auto px-4 lg:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} L-Chama. All rights reserved.</p>
          <p>
            An{' '}
            <a
              href="https://ludevaplc.co.ke"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              Ludeva Plc
            </a>{' '}
            product
          </p>
        </div>
      </div>
    </footer>
  );
}
