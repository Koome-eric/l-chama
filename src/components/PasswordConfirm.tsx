'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Step-up confirmation: sensitive admin actions ask the admin to re-enter
// their password. confirm() resolves with the password, or null if cancelled.
// Outside a provider it resolves null, so the action simply doesn't run.
type Confirm = (message?: string) => Promise<string | null>;
const PasswordConfirmContext = createContext<Confirm>(async () => null);

export function PasswordConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [value, setValue] = useState('');
  const resolver = useRef<((v: string | null) => void) | null>(null);

  const confirm = useCallback<Confirm>((msg) => {
    return new Promise((resolve) => {
      resolver.current?.(null);
      resolver.current = resolve;
      setMessage(msg ?? '');
      setValue('');
      setOpen(true);
    });
  }, []);

  const finish = (result: string | null) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpen(false);
  };

  return (
    <PasswordConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={open} onOpenChange={(o) => { if (!o) finish(null); }}>
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (value) finish(value);
            }}
          >
            <DialogHeader>
              <DialogTitle>Confirm your password</DialogTitle>
              <DialogDescription>
                {message || 'This is a sensitive action. Re-enter your password to continue.'}
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-2">
              <Label htmlFor="step-up-password">Password</Label>
              <Input
                id="step-up-password"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => finish(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!value}>
                Confirm
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PasswordConfirmContext.Provider>
  );
}

export const useConfirmPassword = () => useContext(PasswordConfirmContext);

// Runs a server action; if it answers STEP_UP_REQUIRED, asks for the password
// once and runs it again with it. Resolves null if the admin cancels.
export async function runWithStepUp<T>(confirm: Confirm, run: (password?: string) => Promise<T>): Promise<T | null> {
  let res = await run();
  if ((res as any)?.code === 'STEP_UP_REQUIRED') {
    const password = await confirm((res as any).error);
    if (password === null) return null;
    res = await run(password);
  }
  return res;
}
