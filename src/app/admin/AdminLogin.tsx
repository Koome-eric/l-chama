'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ShieldCheck, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAdmin } from './actions';

export function AdminLogin() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleSubmit(formData: FormData) {
    setError('');
    startTransition(async () => {
      const result = await loginAdmin(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ledger px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-fintech-mesh opacity-80" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image src="/lchama-icon.png" alt="L-Chama" width={66} height={77} className="h-12 w-auto" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">L-Chama</p>
            <h1 className="font-headline text-2xl font-bold text-white">Admin Control Center</h1>
          </div>
        </div>

        <div className="glass-card rounded-3xl border-white/10 p-8 shadow-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-white">Sign in</p>
              <p className="text-sm text-white/60">Authorized personnel only.</p>
            </div>
          </div>

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email" className="text-white/80">Email</Label>
              <Input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="username"
                required
                className="border-white/15 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password" className="text-white/80">Password</Label>
              <Input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="border-white/15 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-primary"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive-foreground/90" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={isPending}>
              {isPending ? 'Signing in…' : 'Sign in to Admin'}
            </Button>
          </form>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-white/40">
          <ShieldCheck className="h-3.5 w-3.5" />
          Sessions are encrypted and expire after 8 hours.
        </p>
      </div>
    </div>
  );
}
