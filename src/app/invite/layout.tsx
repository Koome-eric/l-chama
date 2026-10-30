import { ClerkScope } from '@/components/ClerkScope';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ClerkScope>{children}</ClerkScope>;
}
