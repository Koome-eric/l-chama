'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Accepts either the full invite link or just the token at the end of it.
function extractToken(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  let candidate = value;
  try {
    const url = new URL(value);
    candidate = url.pathname.split('/').filter(Boolean).pop() ?? '';
  } catch {
    candidate = value.split('/').filter(Boolean).pop() ?? '';
  }
  return /^[A-Za-z0-9_-]{8,}$/.test(candidate) ? candidate : null;
}

export function JoinForm() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = extractToken(value);
    if (!token) {
      setError('That doesn’t look like an invite link. Paste the full link your chama official sent you.');
      return;
    }
    setError('');
    router.push(`/invite/${token}`);
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-3">
      <Label htmlFor="invite-link">Invite link</Label>
      <div className="flex gap-2">
        <Input
          id="invite-link"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://l-chama.ludevaplc.co.ke/invite/…"
          aria-describedby={error ? 'invite-error' : undefined}
          aria-invalid={!!error}
        />
        <Button type="submit">Continue</Button>
      </div>
      {error && (
        <p id="invite-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
