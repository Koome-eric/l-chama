// One appearance object for every Clerk surface (sign-in, sign-up), driven by
// the same CSS tokens as the rest of the site so light and dark mode follow
// the app's theme instead of Clerk's fixed light card. The card sits flat on
// the page: AuthShell supplies the framing, so Clerk's own shadow and border
// are removed rather than doubled up.
export const clerkAppearance = {
  variables: {
    colorPrimary: 'hsl(var(--primary))',
    colorBackground: 'hsl(var(--card))',
    colorText: 'hsl(var(--foreground))',
    colorTextSecondary: 'hsl(var(--muted-foreground))',
    colorInputBackground: 'hsl(var(--background))',
    colorInputText: 'hsl(var(--foreground))',
    colorDanger: 'hsl(var(--destructive))',
    borderRadius: '0.75rem',
    fontFamily: 'var(--font-inter), sans-serif',
    fontFamilyButtons: 'var(--font-inter), sans-serif',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full shadow-none border border-border rounded-2xl',
    card: 'shadow-none bg-card',
    headerTitle: 'font-headline tracking-tight',
    formButtonPrimary: 'shadow-none normal-case text-sm font-medium',
    socialButtonsBlockButton: 'border-border',
    socialButtonsBlockButtonText: { color: 'hsl(var(--foreground))' },
    footer: { display: 'none' },
  },
} as const;
