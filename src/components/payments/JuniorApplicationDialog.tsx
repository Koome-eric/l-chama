'use client';

import { useRef, useState } from 'react';
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
import { Baby, FileUp, Loader2 } from 'lucide-react';
import { submitJuniorApplication } from '@/app/(dashboard)/accounts/actions';

// Uploads a single file to Cloudflare R2 via the shared /api/upload-doc
// endpoint and returns its public URL. Same pipeline the main Ludeva
// app uses for KYC documents.
async function uploadDoc(file: File, label: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('label', label);
  formData.append('folder', 'junior-accounts');

  const res = await fetch('/api/upload-doc', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to upload ${label}`);
  }
  const json = await res.json();
  return json.url as string;
}

export function JuniorApplicationDialog({ trigger, defaultOpen }: { trigger?: React.ReactNode; defaultOpen?: boolean }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(!!defaultOpen);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [birthCertFile, setBirthCertFile] = useState<File | null>(null);
  const [childPhotoFile, setChildPhotoFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const childFullName = String(formData.get('childFullName') || '').trim();
    const childDateOfBirth = String(formData.get('childDateOfBirth') || '').trim();
    const guardianIdNumber = String(formData.get('guardianIdNumber') || '').trim();
    const guardianPhone = String(formData.get('guardianPhone') || '').trim();
    const guardianKraPin = String(formData.get('guardianKraPin') || '').trim();

    if (!childFullName || !guardianIdNumber || !guardianPhone || !guardianKraPin) {
      toast({ title: 'Missing details', description: 'Fill in all the required fields.', variant: 'destructive' });
      return;
    }
    if (!birthCertFile || !childPhotoFile) {
      toast({
        title: 'Missing documents',
        description: "Upload both the birth certificate and the child's photo.",
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const [birthCertUrl, childPhotoUrl] = await Promise.all([
        uploadDoc(birthCertFile, 'birth_certificate'),
        uploadDoc(childPhotoFile, 'child_photo'),
      ]);

      await submitJuniorApplication({
        childFullName,
        childDateOfBirth: childDateOfBirth || undefined,
        guardianIdNumber,
        guardianPhone,
        guardianKraPin,
        birthCertUrl,
        childPhotoUrl,
      });

      toast({
        title: 'Application submitted',
        description: "We'll review the documents and open the account once approved.",
      });
      setOpen(false);
      formRef.current?.reset();
      setBirthCertFile(null);
      setChildPhotoFile(null);
      window.location.reload();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
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

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
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
              <Input
                id="birthCert"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => setBirthCertFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            <div>
              <Label htmlFor="childPhoto" className="flex items-center gap-1.5">
                <FileUp className="h-3.5 w-3.5" /> Child's Passport-size Photo
              </Label>
              <Input
                id="childPhoto"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => setChildPhotoFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            <p className="text-[11px] text-muted-foreground">JPG, PNG, or PDF · up to 5MB each.</p>
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
            <Button type="submit" disabled={submitting} className="w-full gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Submitting…' : 'Submit Application'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
