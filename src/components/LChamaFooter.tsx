export default function LChamaFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 lg:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} L-CHAMA — an{' '}
          <a
            href="https://ludevaplc.co.ke"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:text-primary transition-colors"
          >
            Ludeva
          </a>{' '}
          product. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <a
            href="https://ludevaplc.co.ke"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            Ludeva MMF
          </a>
          <a href="mailto:hello@lchama.co.ke" className="hover:text-foreground">
            Contact
          </a>
          <a href="/sign-in" className="hover:text-foreground">
            Sign In
          </a>
        </div>
      </div>
    </footer>
  );
}
