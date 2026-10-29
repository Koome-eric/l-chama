import { PasswordConfirmProvider } from '@/components/PasswordConfirm';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PasswordConfirmProvider>{children}</PasswordConfirmProvider>
  );
}
