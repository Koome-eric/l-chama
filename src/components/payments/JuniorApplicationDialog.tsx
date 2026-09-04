'use client';

import { useRef, useState, useTransition } from 'react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Baby, FileUp } from 'lucide-react';
import { submitJuniorApplication } from '@/app/(dashboard)/accounts/actions';

export function JuniorApplicationDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        await submitJuniorApplication(formData);
        toast({
          title: 'Application submitted',
          description: "We'll review the documents and open the account once approved.",
        });
        setOpen(false);
        formRef.current?.reset();
        window.location.reload();
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-2">
            <Baby className="h-4 w-4" /> Apply for Junior Account
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Baby className="h-5 w-5 text-primary" /> Ludeva Junior Account
          </DialogTitle>
          <DialogDescription>
            Open a savings account for your child. We'll review the documents below before the account
            is activated.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="childFullName">Child's Full Name</Label>
              <Input id="childFullName" name="childFullName" required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="childDateOfBirth">Child's Date of Birth</Label>
              <Input id="childDateOfBirth" name="childDateOfBirth" type="date" />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-dashed border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Registration documents
            </p>
            <div>
              <Label htmlFor="birthCert" className="flex items-center gap-1.5">
                <FileUp className="h-3.5 w-3.5" /> Child's Birth Certificate
              </Label>
              <Input id="birthCert" name="birthCert" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" required />
            </div>
            <div>
              <Label htmlFor="childPhoto" className="flex items-center gap-1.5">
                <FileUp className="h-3.5 w-3.5" /> Child's Passport-size Photo
              </Label>
              <Input id="childPhoto" name="childPhoto" type="file" accept=".jpg,.jpeg,.png,.webp" required />
            </div>
            <p className="text-[11px] text-muted-foreground">JPG, PNG, or PDF · up to 4MB each.</p>
          </div>

          <div className="space-y-3 rounded-xl border border-dashed border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Parent / Guardian details
            </p>
            <div>
              <Label htmlFor="guardianIdNumber">ID / Passport Number</Label>
              <Input id="guardianIdNumber" name="guardianIdNumber" required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="guardianPhone">Phone Number</Label>
                <Input id="guardianPhone" name="guardianPhone" placeholder="07XX XXX XXX" required />
              </div>
              <div>
                <Label htmlFor="guardianKraPin">KRA PIN</Label>
                <Input id="guardianKraPin" name="guardianKraPin" placeholder="A00XXXXXXXP" required />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending} className="w-full gap-2">
              {isPending ? 'Submitting…' : 'Submit Application'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
