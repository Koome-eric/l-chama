import { ClerkProvider } from '@clerk/nextjs';
import { clerkLocalization } from '@/lib/clerk-localization';

// Clerk's browser SDK is only loaded under routes that wrap themselves in
// this component: sign-in, sign-up, invite, admin and the signed-in app.
// The public pages (home, products, loans, ...) read the session on the
// server instead, so visitors there download no Clerk code at all.
export function ClerkScope({ children }: { children: React.ReactNode }) {
  return <ClerkProvider localization={clerkLocalization as any}>{children}</ClerkProvider>;
}
