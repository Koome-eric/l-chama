import { ClerkScope } from '@/components/ClerkScope';
import { PasswordConfirmProvider } from '@/components/PasswordConfirm';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkScope>
      <PasswordConfirmProvider>{children}</PasswordConfirmProvider>
    </ClerkScope>
  );
}
